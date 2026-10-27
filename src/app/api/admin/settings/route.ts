import { NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/auth";
import { getSetting, setSetting, jsonError } from "@/lib/api-helpers";
import { adminSettingsSchema, firstZodError } from "@/lib/validate";
import { DEFAULT_ID_POLICY } from "@/lib/config";
import { logSystem } from "@/lib/logger";

/** GET /api/admin/settings */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return jsonError("دسترسی غیرمجاز", 403);
  const policy = await getSetting("id_delete_policy", DEFAULT_ID_POLICY);
  return Response.json({ ok: true, settings: { id_delete_policy: policy } });
}

/** PATCH /api/admin/settings — e.g. switch ID release policy */
export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return jsonError("دسترسی غیرمجاز", 403);

  const body = await req.json().catch(() => null);
  const parsed = adminSettingsSchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  await setSetting("id_delete_policy", parsed.data.id_delete_policy);
  logSystem("action", "admin", `ID policy set to: ${parsed.data.id_delete_policy}`);
  return Response.json({ ok: true });
}
