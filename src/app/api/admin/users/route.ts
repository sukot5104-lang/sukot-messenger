import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { adminUserActionSchema, firstZodError } from "@/lib/validate";
import { OFFICIAL_ID } from "@/lib/config";
import { notifyChat, ROOM_USER } from "@/lib/notify";
import { fetchOnlineUserIds } from "@/lib/notify";
import { logSystem } from "@/lib/logger";

/** GET /api/admin/users?q= — list users */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return jsonError("دسترسی غیرمجاز", 403);

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const users = await db.user.findMany({
    where: q
      ? {
          OR: [{ usernameLower: { contains: q } }, { displayName: { contains: q } }],
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarColor: true,
      isVerified: true,
      isBanned: true,
      banReason: true,
      deletedAt: true,
      lastSeen: true,
      createdAt: true,
    },
  });

  const online = new Set(await fetchOnlineUserIds());

  return Response.json({
    ok: true,
    users: users.map((u) => ({
      ...u,
      lastSeen: u.lastSeen.toISOString(),
      createdAt: u.createdAt.toISOString(),
      deletedAt: u.deletedAt?.toISOString() ?? null,
      online: online.has(u.id),
    })),
  });
}

/** PATCH /api/admin/users — ban / unban / verify / delete / free ID */
export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return jsonError("دسترسی غیرمجاز", 403);

  const body = await req.json().catch(() => null);
  const parsed = adminUserActionSchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const { userId, action, reason } = parsed.data;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return jsonError("کاربر پیدا نشد", 404);

  // Protect the official Sukot account from destructive actions
  if (user.usernameLower === OFFICIAL_ID && ["ban", "delete", "free"].includes(action)) {
    return jsonError("حساب رسمی Sukot قابل تغییر به این روش نیست", 403);
  }

  switch (action) {
    case "ban": {
      await db.user.update({
        where: { id: userId },
        data: { isBanned: true, banReason: reason || "نقض قوانین" },
      });
      notifyChat("force:logout", { reason: reason || "حساب شما مسدود شده است" }, [
        ROOM_USER(userId),
      ]);
      logSystem("action", "admin", `banned @${user.username}`);
      break;
    }
    case "unban": {
      await db.user.update({
        where: { id: userId },
        data: { isBanned: false, banReason: "" },
      });
      logSystem("action", "admin", `unbanned @${user.username}`);
      break;
    }
    case "verify": {
      await db.user.update({ where: { id: userId }, data: { isVerified: true } });
      logSystem("action", "admin", `verified @${user.username}`);
      break;
    }
    case "unverify": {
      await db.user.update({ where: { id: userId }, data: { isVerified: false } });
      logSystem("action", "admin", `unverified @${user.username}`);
      break;
    }
    case "delete":
    case "free": {
      await db.user.delete({ where: { id: userId } }); // ID becomes free (cascade all)
      notifyChat("account:deleted", { userId }, ["all"]);
      logSystem("action", "admin", `deleted user + freed ID @${user.username}`);
      break;
    }
  }

  return Response.json({ ok: true });
}
