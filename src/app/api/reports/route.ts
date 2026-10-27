import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { reportSchema, firstZodError } from "@/lib/validate";
import { rateLimit } from "@/lib/rate-limit";
import { logSystem } from "@/lib/logger";

/** POST /api/reports — report a user */
export async function POST(req: NextRequest) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);

    const rl = rateLimit(`report:${me.id}`, 5, 60 * 60 * 1000);
    if (!rl.allowed)
      return jsonError("گزارش‌های زیاد؛ لطفاً بعداً تلاش کنید", 429);

    const body = await req.json().catch(() => null);
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

    const lower = parsed.data.username.trim().toLowerCase();
    const target = await db.user.findUnique({ where: { usernameLower: lower } });
    if (!target || target.deletedAt) return jsonError("کاربر پیدا نشد", 404);
    if (target.id === me.id) return jsonError("نمی‌توانید خودتان را گزارش کنید", 400);

    await db.report.create({
      data: {
        reporterId: me.id,
        reportedId: target.id,
        reason: parsed.data.reason,
        details: parsed.data.details ?? "",
      },
    });

    logSystem("action", "report", `@${me.username} reported @${target.username} (${parsed.data.reason})`);
    return Response.json({ ok: true });
  } catch {
    return jsonError("خطای سرور", 500);
  }
}
