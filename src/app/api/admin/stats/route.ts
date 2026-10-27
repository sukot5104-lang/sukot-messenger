import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { fetchOnlineUserIds } from "@/lib/notify";

/** GET /api/admin/stats — service overview */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return jsonError("دسترسی غیرمجاز", 403);

  const [totalUsers, activeUsers, bannedUsers, deletedUsers, totalMessages, totalConversations, openReports, reservedCount] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { deletedAt: null, isBanned: false } }),
      db.user.count({ where: { isBanned: true } }),
      db.user.count({ where: { deletedAt: { not: null } } }),
      db.message.count(),
      db.conversation.count(),
      db.report.count({ where: { status: "open" } }),
      db.reservedId.count(),
    ]);

  const online = await fetchOnlineUserIds();

  return Response.json({
    ok: true,
    stats: {
      totalUsers,
      activeUsers,
      bannedUsers,
      deletedUsers,
      totalMessages,
      totalConversations,
      openReports,
      reservedCount,
      onlineCount: online.length,
    },
  });
}
