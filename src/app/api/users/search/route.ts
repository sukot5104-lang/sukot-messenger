import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { fetchOnlineUserIds } from "@/lib/notify";

/** GET /api/users/search?q=<id> — search users by unique ID */
export async function GET(req: NextRequest) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);

    const rl = rateLimit(`search:${clientIp(req)}`, 60, 60 * 1000);
    if (!rl.allowed) return jsonError("درخواست‌های زیاد، کمی صبر کنید", 429);

    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
    if (!q) return Response.json({ ok: true, results: [] });

    const users = await db.user.findMany({
      where: {
        usernameLower: { contains: q },
        id: { not: me.id },
        deletedAt: null,
        isBanned: false,
      },
      select: {
        id: true,
        username: true,
        usernameLower: true,
        displayName: true,
        avatarColor: true,
        isVerified: true,
        lastSeen: true,
      },
      take: 20,
    });

    // exact match first
    users.sort((a, b) =>
      a.usernameLower === q ? -1 : b.usernameLower === q ? 1 : a.username.localeCompare(b.username)
    );

    const online = new Set(await fetchOnlineUserIds());

    return Response.json({
      ok: true,
      results: users.map((u) => ({
        ...u,
        lastSeen: u.lastSeen.toISOString(),
        online: online.has(u.id),
      })),
    });
  } catch {
    return jsonError("خطای سرور", 500);
  }
}
