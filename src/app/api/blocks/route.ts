import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { blockSchema, firstZodError } from "@/lib/validate";
import { logSystem } from "@/lib/logger";

/** GET /api/blocks — list users I blocked */
export async function GET(req: NextRequest) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);

    const blocks = await db.block.findMany({
      where: { blockerId: me.id },
      include: { blocked: true },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({
      ok: true,
      blocked: blocks
        .filter((b) => !b.blocked.deletedAt)
        .map((b) => ({
          id: b.blocked.id,
          username: b.blocked.username,
          displayName: b.blocked.displayName,
          avatarColor: b.blocked.avatarColor,
          isVerified: b.blocked.isVerified,
          blockedAt: b.createdAt.toISOString(),
        })),
    });
  } catch {
    return jsonError("خطای سرور", 500);
  }
}

/** POST /api/blocks — block a user by ID */
export async function POST(req: NextRequest) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);

    const body = await req.json().catch(() => null);
    const parsed = blockSchema.safeParse(body);
    if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

    const lower = parsed.data.username.trim().toLowerCase();
    const target = await db.user.findUnique({ where: { usernameLower: lower } });
    if (!target || target.deletedAt) return jsonError("کاربر پیدا نشد", 404);
    if (target.id === me.id) return jsonError("نمی‌توانید خودتان را مسدود کنید", 400);

    await db.block.upsert({
      where: { blockerId_blockedId: { blockerId: me.id, blockedId: target.id } },
      update: {},
      create: { blockerId: me.id, blockedId: target.id },
    });

    logSystem("action", "block", `@${me.username} blocked @${target.username}`);
    return Response.json({ ok: true });
  } catch {
    return jsonError("خطای سرور", 500);
  }
}

/** DELETE /api/blocks?username=<id> — unblock */
export async function DELETE(req: NextRequest) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);

    const username = req.nextUrl.searchParams.get("username") ?? "";
    const lower = username.trim().toLowerCase();
    const target = await db.user.findUnique({ where: { usernameLower: lower } });
    if (!target) return jsonError("کاربر پیدا نشد", 404);

    await db.block.deleteMany({ where: { blockerId: me.id, blockedId: target.id } });
    logSystem("action", "block", `@${me.username} unblocked @${target.username}`);
    return Response.json({ ok: true });
  } catch {
    return jsonError("خطای سرور", 500);
  }
}
