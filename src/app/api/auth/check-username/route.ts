import { NextRequest } from "next/server";
import { checkUsername } from "@/lib/validate";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { jsonError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const rl = rateLimit(`check-username:${clientIp(req)}`, 30, 60 * 1000);
  if (!rl.allowed) return jsonError("درخواست‌های زیاد، کمی صبر کنید", 429);

  const q = req.nextUrl.searchParams.get("username") ?? "";
  const check = await checkUsername(q);
  return Response.json({ ok: true, available: check.ok, reason: check.reason ?? null });
}
