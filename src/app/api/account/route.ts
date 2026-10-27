import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/config";
import { cookieOptions, getSetting, jsonError } from "@/lib/api-helpers";
import { deleteAccountSchema, firstZodError } from "@/lib/validate";
import { DEFAULT_ID_POLICY, OFFICIAL_ID } from "@/lib/config";
import { notifyChat } from "@/lib/notify";
import { logSystem } from "@/lib/logger";

/**
 * DELETE /api/account — delete my account (requires password).
 * ID policy (managed in admin panel, Setting: id_delete_policy):
 *  - "release": the user row is hard-deleted → the ID becomes free for re-registration
 *  - "reserve": the row is kept with deletedAt → the ID stays reserved (never reusable)
 */
export async function DELETE(req: NextRequest) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);

    if (me.usernameLower === OFFICIAL_ID)
      return jsonError("حساب رسمی قابل حذف نیست", 403);

    const body = await req.json().catch(() => null);
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

    if (!me.passwordHash || !verifyPassword(parsed.data.password, me.passwordHash))
      return jsonError("رمز عبور اشتباه است", 403);

    const policy = await getSetting("id_delete_policy", DEFAULT_ID_POLICY);

    // erase user's messages everywhere
    await db.message.deleteMany({ where: { senderId: me.id } });
    // clear typing/leftover blocks they created
    await db.block.deleteMany({ where: { blockerId: me.id } });

    if (policy === "release") {
      await db.user.delete({ where: { id: me.id } }); // cascades participations, blocks, reports
      logSystem("action", "account", `account DELETED, ID released: @${me.username}`);
    } else {
      // reserve: keep the row so the ID can never be claimed again
      await db.user.update({
        where: { id: me.id },
        data: {
          deletedAt: new Date(),
          passwordHash: "",
          displayName: "کاربر حذف‌شده",
          bio: "",
          avatarColor: "#3f3352",
          isVerified: false,
          isAdmin: false,
        },
      });
      logSystem("action", "account", `account DELETED, ID reserved: @${me.username}`);
    }

    // clean up conversations that now have zero participants
    const orphans = await db.conversation.findMany({
      where: { participations: { none: {} } },
      select: { id: true },
    });
    if (orphans.length) {
      await db.conversation.deleteMany({ where: { id: { in: orphans.map((o) => o.id) } } });
    }

    notifyChat("account:deleted", { userId: me.id }, ["all"]);

    const res = NextResponse.json({ ok: true, policy });
    res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(req), maxAge: 0 });
    return res;
  } catch (e) {
    logSystem("error", "account/delete", e instanceof Error ? e.message : String(e));
    return jsonError("خطای سرور در حذف حساب", 500);
  }
}
