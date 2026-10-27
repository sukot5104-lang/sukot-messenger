import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { notifyChat, ROOM_USER } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/conversations/[id]/messages — REST fallback for socket send */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);
    if (me.isBanned) return jsonError("حساب شما مسدود شده است", 403);

    const rl = rateLimit(`rest-msg:${me.id}`, 25, 10_000);
    if (!rl.allowed)
      return jsonError("ارسال پیام بیش از حد مجاز است، کمی صبر کنید", 429);

    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as {
      content?: unknown;
      clientId?: unknown;
    } | null;
    const content = String(body?.content ?? "").trim();
    const clientId =
      typeof body?.clientId === "string" ? body.clientId : undefined;
    if (!content || content.length > 4000)
      return jsonError("پیام نامعتبر است", 400);

    const myPart = await db.participation.findFirst({
      where: { conversationId: id, userId: me.id, deletedAt: null },
    });
    if (!myPart) return jsonError("گفت‌وگو پیدا نشد", 404);

    const participants = await db.participation.findMany({
      where: { conversationId: id, deletedAt: null },
      select: { userId: true },
    });
    const other = participants.find((p) => p.userId !== me.id);
    if (other) {
      const otherUser = await db.user.findUnique({
        where: { id: other.userId },
      });
      if (!otherUser || otherUser.deletedAt)
        return jsonError("این حساب حذف شده و پیام‌ها ارسال نمی‌شوند", 400);
      const blocked = await db.block.count({
        where: {
          OR: [
            { blockerId: me.id, blockedId: other.userId },
            { blockerId: other.userId, blockedId: me.id },
          ],
        },
      });
      if (blocked > 0) return jsonError("امکان ارسال پیام به این کاربر نیست", 403);
    }

    const message = await db.message.create({
      data: { conversationId: id, senderId: me.id, content },
    });
    await db.conversation.update({
      where: { id },
      data: { lastMessageAt: message.createdAt },
    });
    // re-show conversation in sender's list if previously hidden
    await db.participation.updateMany({
      where: { conversationId: id, userId: me.id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    const dto = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };
    // live delivery to connected clients via user rooms (best-effort)
    notifyChat("message:new", { message: dto, clientId }, [
      ROOM_USER(me.id),
      ...participants.filter((p) => p.userId !== me.id).map((p) => ROOM_USER(p.userId)),
    ]);

    return Response.json({ ok: true, message: dto, clientId });
  } catch {
    return jsonError("خطای سرور", 500);
  }
}

/** GET /api/conversations/[id]/messages?before=<ISO>&limit=50 — message history */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);
    const { id } = await ctx.params;

    const myPart = await db.participation.findFirst({
      where: { conversationId: id, userId: me.id },
    });
    if (!myPart) return jsonError("گفت‌وگو پیدا نشد", 404);

    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10) || 50,
      100
    );
    const before = req.nextUrl.searchParams.get("before");

    const messages = await db.message.findMany({
      where: {
        conversationId: id,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return Response.json({
      ok: true,
      messages: messages
        .map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        }))
        .reverse(),
      hasMore: messages.length === limit,
    });
  } catch {
    return jsonError("خطای سرور", 500);
  }
}
