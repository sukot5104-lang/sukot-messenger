import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { fetchOnlineUserIds } from "@/lib/notify";

/** GET /api/presence — list of currently online user ids */
export async function GET(req: NextRequest) {
  const me = await getAuthUser(req);
  if (!me) return jsonError("احراز هویت نشده", 401);
  const online = await fetchOnlineUserIds();
  return Response.json({ ok: true, online });
}
