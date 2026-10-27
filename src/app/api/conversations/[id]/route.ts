import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { logSystem } from "@/lib/logger";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/conversations/[id] — conversation header info */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);
    const { id } = await ctx.params;

    const myPart = await db.participation.findFirst({
      where: { conversationId: id, userId: me.id, deletedAt: null },
    });
    if (!myPart) return jsonError("گفت‌وگو پیدا نشد", 404);

    const otherPart = await db.participation.findFirst({
      where: { conversationId: id, userId: { not: me.id } },
      include: { user: true },
    });

    const iBlocked = otherPart
      ? !!(await db.block.findFirst({ where: { blockerId: me.id, blockedId: otherPart.userId } }))
      : false;
    const blockedMe = otherPart
      ? !!(await db.block.findFirst({ where: { blockerId: otherPart.userId, blockedId: me.id } }))
      : false;

    return Response.json({
      ok: true,
      conversation: {
        id,
        myLastReadAt: myPart.lastReadAt?.toISOString() ?? null,
        other: otherPart
          ? {
              id: otherPart.user.id,
              username: otherPart.user.username,
              displayName: otherPart.user.displayName,
              bio: otherPart.user.bio,
              avatarColor: otherPart.user.avatarColor,
              isVerified: otherPart.user.isVerified,
              lastSeen: otherPart.user.lastSeen.toISOString(),
              deleted: !!otherPart.user.deletedAt,
            }
          : null,
        otherLastReadAt: otherPart?.lastReadAt?.toISOString() ?? null,
        otherLastDeliveredAt: otherPart?.lastDeliveredAt?.toISOString() ?? null,
        iBlocked,
        blockedMe,
      },
    });
  } catch (e) {
    logSystem("error", "conversation/get", e instanceof Error ? e.message : String(e));
    return jsonError("خطای سرور", 500);
  }
}

/** DELETE /api/conversations/[id] — remove conversation from MY list */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);
    const { id } = await ctx.params;

    const myPart = await db.participation.findFirst({
      where: { conversationId: id, userId: me.id },
    });
    if (!myPart) return jsonError("گفت‌وگو پیدا نشد", 404);

    await db.participation.update({
      where: { id: myPart.id },
      data: { deletedAt: new Date(), lastReadAt: new Date() },
    });

    logSystem("action", "conversation", `@${me.username} hid conversation ${id}`);
    return Response.json({ ok: true });
  } catch (e) {
    logSystem("error", "conversation/delete", e instanceof Error ? e.message : String(e));
    return jsonError("خطای سرور", 500);
  }
}
