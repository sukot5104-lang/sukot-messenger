import { NextRequest } from "next/server";
import { getAuthUser, publicUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { fetchOnlineUserIds } from "@/lib/notify";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("احراز هویت نشده", 401);
    const online = await fetchOnlineUserIds();
    return Response.json({ ok: true, user: publicUser(user), online });
  } catch {
    return jsonError("خطای سرور", 500);
  }
}
