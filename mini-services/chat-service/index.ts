/**
 * SUKOT MESSENGER — Real-time chat service (socket.io)
 * -----------------------------------------------------
 * Handles: presence (online/offline), live messaging, typing indicators,
 * delivered/read receipts, internal emit bridge for REST APIs.
 *
 * Port: 3003 (front-end connects with  io('/?XTransformPort=3003')  through Caddy)
 */
import { createServer, IncomingMessage, ServerResponse } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

// ---- env ------------------------------------------------------------------
const PORT = Number(process.env.CHAT_SERVICE_PORT || 3003);
const INTERNAL_PORT = Number(process.env.CHAT_INTERNAL_PORT || 3004);
const JWT_SECRET =
  process.env.JWT_SECRET || "sukot-messenger-jwt-8f4a2c1e9b3d";
const INTERNAL_SECRET =
  process.env.INTERNAL_SECRET || "sukot-internal-5e7a9c1f";

const db = new PrismaClient();

// ---- presence --------------------------------------------------------------
const onlineUsers = new Map<string, Set<string>>(); // userId -> socketIds
const typingUsers = new Map<string, Set<string>>(); // conversationId -> userIds
const rateBuckets = new Map<string, number[]>(); // userId:action -> timestamps

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = (rateBuckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (bucket.length >= limit) {
    rateBuckets.set(key, bucket);
    return false;
  }
  bucket.push(now);
  rateBuckets.set(key, bucket);
  return true;
}

function parseCookies(header: string | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(
      part.slice(idx + 1).trim()
    );
  }
  return out;
}

function getUserIdFromSocket(socket: Socket): string | null {
  // 1) explicit auth token (client may pass token)
  const auth = (socket.handshake.auth ?? {}) as { token?: string };
  if (auth.token) {
    try {
      const payload = jwt.verify(auth.token, JWT_SECRET) as jwt.JwtPayload;
      if (typeof payload.uid === "string") return payload.uid;
    } catch {
      /* fallthrough */
    }
  }
  // 2) session cookie (same-origin through Caddy)
  const cookies = parseCookies(socket.request.headers.cookie);
  const cookieToken = cookies["sukot_session"];
  if (cookieToken) {
    try {
      const payload = jwt.verify(cookieToken, JWT_SECRET) as jwt.JwtPayload;
      if (typeof payload.uid === "string") return payload.uid;
    } catch {
      /* invalid */
    }
  }
  return null;
}

// ---- Internal bridge server (REST -> socket.io) ------------------------------
const internalServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = req.url || "";

  if (url.startsWith("/internal/emit")) {
    if (req.headers["x-internal-secret"] !== INTERNAL_SECRET) {
      res.writeHead(403).end("forbidden");
      return;
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const { event, payload, rooms } = JSON.parse(body) as {
          event: string;
          payload: unknown;
          rooms: string[];
        };
        if (!event || !Array.isArray(rooms)) {
          res.writeHead(400).end("bad request");
          return;
        }
        if (rooms[0] === "all") {
          io.emit(event, payload);
        } else {
          for (const room of rooms) io.to(room).emit(event, payload);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400).end("bad json");
      }
    });
    return;
  }

  if (url.startsWith("/internal/online")) {
    if (req.headers["x-internal-secret"] !== INTERNAL_SECRET) {
      res.writeHead(403).end("forbidden");
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ online: Array.from(onlineUsers.keys()) }));
    return;
  }

  if (url.startsWith("/internal/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, online: onlineUsers.size }));
    return;
  }

  res.writeHead(404).end("not found");
});

internalServer.listen(INTERNAL_PORT, () => {
  console.log(`SUKOT internal bridge listening on port ${INTERNAL_PORT}`);
});

// ---- socket.io ---------------------------------------------------------------
const httpServer = createServer();
const io = new SocketIOServer(httpServer, {
  // DO NOT change the path: Caddy forwards everything with XTransformPort query here.
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// socket.io must also accept the engine.io handshake on any path (Caddy keeps /socket.io/…)
io.engine.on("connection_error", (err: { req: IncomingMessage; message: string }) => {
  console.error("[engine] connection error:", err.message);
});

async function joinedConversationIds(userId: string): Promise<string[]> {
  const rows = await db.participation.findMany({
    where: { userId, deletedAt: null },
    select: { conversationId: true },
  });
  return rows.map((r) => r.conversationId);
}

async function isMember(conversationId: string, userId: string): Promise<boolean> {
  const p = await db.participation.findFirst({
    where: { conversationId, userId, deletedAt: null },
  });
  return !!p;
}

async function blockedBetween(a: string, b: string): Promise<boolean> {
  const count = await db.block.count({
    where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] },
  });
  return count > 0;
}

function sanitizeMessage(m: {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  };
}

io.use(async (socket, next) => {
  const uid = getUserIdFromSocket(socket);
  if (!uid) return next(new Error("unauthorized"));
  try {
    const user = await db.user.findUnique({ where: { id: uid } });
    if (!user || user.deletedAt || user.isBanned)
      return next(new Error("unauthorized"));
    (socket.data as { userId: string }).userId = uid;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", async (socket) => {
  const userId = (socket.data as { userId: string }).userId;
  console.log(`[socket] connected user=${userId} sid=${socket.id}`);

  // presence: online
  {
    const set = onlineUsers.get(userId) ?? new Set<string>();
    const wasOffline = set.size === 0;
    set.add(socket.id);
    onlineUsers.set(userId, set);
    if (wasOffline) {
      io.emit("presence", { userId, online: true, lastSeen: null });
    }
  }

  // join personal + conversation rooms
  socket.join(`user:${userId}`);
  try {
    const convIds = await joinedConversationIds(userId);
    for (const cid of convIds) socket.join(`conv:${cid}`);
  } catch (e) {
    console.error("[socket] join rooms failed", e);
  }

  // ---- send message ---------------------------------------------------------
  socket.on(
    "message:send",
    async (
      data: { conversationId: string; content: string; clientId?: string },
      ack?: (resp: unknown) => void
    ) => {
      try {
        if (!rateLimit(`msg:${userId}`, 25, 10_000)) {
          ack?.({ ok: false, error: "ارسال پیام بیش از حد مجاز است، کمی صبر کنید" });
          return;
        }
        const conversationId = String(data?.conversationId ?? "");
        const content = String(data?.content ?? "").trim();
        if (!conversationId || !content || content.length > 4000) {
          ack?.({ ok: false, error: "پیام نامعتبر است" });
          return;
        }
        if (!(await isMember(conversationId, userId))) {
          ack?.({ ok: false, error: "دسترسی به این گفت‌وگو ندارید" });
          return;
        }
        const participants = await db.participation.findMany({
          where: { conversationId, deletedAt: null },
          select: { userId: true },
        });
        const other = participants.find((p) => p.userId !== userId);
        if (other) {
          const otherUser = await db.user.findUnique({ where: { id: other.userId } });
          if (!otherUser || otherUser.deletedAt) {
            ack?.({ ok: false, error: "این حساب حذف شده و پیام‌ها ارسال نمی‌شوند" });
            return;
          }
          if (await blockedBetween(userId, other.userId)) {
            ack?.({ ok: false, error: "امکان ارسال پیام به این کاربر نیست" });
            return;
          }
        }

        const message = await db.message.create({
          data: { conversationId, senderId: userId, content },
        });
        await db.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: message.createdAt },
        });
        // re-show conversation in sender's list if previously hidden
        await db.participation.updateMany({
          where: { conversationId, userId, deletedAt: { not: null } },
          data: { deletedAt: null },
        });

        const payload = {
          message: sanitizeMessage(message),
          clientId: data?.clientId,
        };
        io.to(`conv:${conversationId}`).emit("message:new", payload);
        ack?.({ ok: true, ...payload });
      } catch (e) {
        console.error("[socket] message:send error", e);
        ack?.({ ok: false, error: "خطا در ارسال پیام" });
      }
    }
  );

  // ---- delivered / read receipts ---------------------------------------------
  socket.on("message:delivered", async (data: { conversationId: string }) => {
    try {
      const conversationId = String(data?.conversationId ?? "");
      if (!conversationId || !(await isMember(conversationId, userId))) return;
      const now = new Date();
      await db.participation.updateMany({
        where: { conversationId, userId },
        data: { lastDeliveredAt: now },
      });
      io.to(`conv:${conversationId}`).emit("message:status", {
        conversationId,
        userId,
        kind: "delivered",
        at: now.toISOString(),
      });
    } catch (e) {
      console.error("[socket] delivered error", e);
    }
  });

  socket.on("message:read", async (data: { conversationId: string }) => {
    try {
      const conversationId = String(data?.conversationId ?? "");
      if (!conversationId || !(await isMember(conversationId, userId))) return;
      const now = new Date();
      await db.participation.updateMany({
        where: { conversationId, userId },
        data: { lastReadAt: now, lastDeliveredAt: now },
      });
      typingUsers.get(conversationId)?.delete(userId);
      io.to(`conv:${conversationId}`).emit("message:status", {
        conversationId,
        userId,
        kind: "read",
        at: now.toISOString(),
      });
      socket.to(`conv:${conversationId}`).emit("typing", {
        conversationId,
        userId,
        isTyping: false,
      });
    } catch (e) {
      console.error("[socket] read error", e);
    }
  });

  // ---- typing -----------------------------------------------------------------
  socket.on("typing", (data: { conversationId: string; isTyping: boolean }) => {
    try {
      const conversationId = String(data?.conversationId ?? "");
      if (!conversationId) return;
      if (!rateLimit(`typing:${userId}`, 20, 10_000)) return;
      const set = typingUsers.get(conversationId) ?? new Set<string>();
      if (data.isTyping) set.add(userId);
      else set.delete(userId);
      typingUsers.set(conversationId, set);
      socket.to(`conv:${conversationId}`).emit("typing", {
        conversationId,
        userId,
        isTyping: !!data.isTyping,
      });
    } catch (e) {
      console.error("[socket] typing error", e);
    }
  });

  // ---- refresh conversation list (after create/delete/block) -------------------
  socket.on("conversations:sync", async () => {
    try {
      const convIds = await joinedConversationIds(userId);
      for (const cid of convIds) socket.join(`conv:${cid}`);
      socket.emit("conversations:synced", {});
    } catch (e) {
      console.error("[socket] sync error", e);
    }
  });

  // ---- disconnect ---------------------------------------------------------------
  socket.on("disconnect", async () => {
    const set = onlineUsers.get(userId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) {
        onlineUsers.delete(userId);
        const lastSeen = new Date();
        try {
          await db.user.update({
            where: { id: userId },
            data: { lastSeen },
          });
        } catch {
          /* ignore */
        }
        io.emit("presence", {
          userId,
          online: false,
          lastSeen: lastSeen.toISOString(),
        });
        // clear typing flags
        for (const [cid, users] of typingUsers) {
          if (users.has(userId)) {
            users.delete(userId);
            io.to(`conv:${cid}`).emit("typing", {
              conversationId: cid,
              userId,
              isTyping: false,
            });
          }
        }
      }
    }
    console.log(`[socket] disconnected user=${userId} sid=${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`SUKOT chat service (socket.io) running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  httpServer.close(() => process.exit(0));
  internalServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  httpServer.close(() => process.exit(0));
  internalServer.close(() => process.exit(0));
});
