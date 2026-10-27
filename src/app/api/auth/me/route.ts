import { NextRequest } from "next/server";
import { getAuthUser, publicUser, signSession } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { fetchOnlineUserIds } from "@/lib/notify";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("احراز هویت نشده", 401);
    const online = await fetchOnlineUserIds();
    // fresh token for the socket handshake (also rotates the 30d expiry)
    return Response.json({ ok: true, token: signSession(user.id), user: publicUser(user), online });
  } catch {
    return jsonError("خطای سرور", 500);
  }
}
