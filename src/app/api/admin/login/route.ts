import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ADMIN_PASSWORD, ADMIN_COOKIE } from "@/lib/config";
import { signAdminSession } from "@/lib/auth";
import { cookieOptions, jsonError } from "@/lib/api-helpers";
import { adminLoginSchema, firstZodError } from "@/lib/validate";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logSystem } from "@/lib/logger";

/** POST /api/admin/login — independent admin authentication */
export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`admin-login:${clientIp(req)}`, 8, 10 * 60 * 1000);
    if (!rl.allowed) return jsonError("تلاش‌های زیاد؛ بعداً تلاش کنید", 429);

    const body = await req.json().catch(() => null);
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

    // timing-safe comparison
    const a = crypto.createHash("sha256").update(parsed.data.password).digest();
    const b = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();

    if (!crypto.timingSafeEqual(a, b)) {
      logSystem("warn", "admin", "failed admin login attempt");
      return jsonError("رمز مدیریت اشتباه است", 401);
    }

    logSystem("action", "admin", "admin logged in");
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, signAdminSession(), {
      ...cookieOptions(req),
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch (e) {
    logSystem("error", "admin/login", e instanceof Error ? e.message : String(e));
    return jsonError("خطای سرور", 500);
  }
}
