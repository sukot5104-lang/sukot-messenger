import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyPassword,
  signSession,
} from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/config";
import { cookieOptions } from "@/lib/api-helpers";
import { loginSchema, firstZodError } from "@/lib/validate";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logSystem } from "@/lib/logger";
import { fetchOnlineUserIds } from "@/lib/notify";

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`login:${clientIp(req)}`, 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `تلاش‌های ناموفق زیاد است. ${Math.ceil(rl.retryAfterSec / 60)} دقیقه دیگر تلاش کنید`,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ ok: false, error: firstZodError(parsed.error) }, { status: 400 });

    const lower = parsed.data.username.trim().toLowerCase();
    const user = await db.user.findUnique({ where: { usernameLower: lower } });

    if (!user || !user.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
      logSystem("warn", "auth", `failed login attempt @${lower}`);
      return NextResponse.json(
        { ok: false, error: "آیدی یا رمز عبور اشتباه است" },
        { status: 401 }
      );
    }

    if (user.deletedAt) {
      return NextResponse.json(
        { ok: false, error: "این حساب حذف شده است" },
        { status: 403 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        {
          ok: false,
          error: `حساب شما مسدود شده است${user.banReason ? `: ${user.banReason}` : ""}`,
        },
        { status: 403 }
      );
    }

    await db.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } });
    logSystem("info", "auth", `login @${user.username}`);

    const token = signSession(user.id);
    const online = await fetchOnlineUserIds();
    const res = NextResponse.json({
      ok: true,
      online,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        isVerified: user.isVerified,
      },
    });
    res.cookies.set(SESSION_COOKIE, token, {
      ...cookieOptions(req),
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e) {
    logSystem("error", "auth/login", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ ok: false, error: "خطای سرور در ورود" }, { status: 500 });
  }
}
