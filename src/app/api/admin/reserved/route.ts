import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { adminReservedSchema, firstZodError, USERNAME_REGEX } from "@/lib/validate";
import { logSystem } from "@/lib/logger";

/** GET /api/admin/reserved — list reserved IDs */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return jsonError("دسترسی غیرمجاز", 403);
  const items = await db.reservedId.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json({ ok: true, reserved: items });
}

/** POST /api/admin/reserved — add a reserved ID */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return jsonError("دسترسی غیرمجاز", 403);

  const body = await req.json().catch(() => null);
  const parsed = adminReservedSchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const name = parsed.data.name.trim();
  if (!USERNAME_REGEX.test(name))
    return jsonError("آیدی باید ۳ تا ۲۰ کاراکتر لاتین/عدد/_ باشد", 400);

  const existingUser = await db.user.findUnique({
    where: { usernameLower: name.toLowerCase() },
  });
  if (existingUser && !existingUser.deletedAt)
    return jsonError("این آیدی در حال حاضر توسط کاربری استفاده می‌شود", 409);

  const item = await db.reservedId.upsert({
    where: { nameLower: name.toLowerCase() },
    update: { note: parsed.data.note ?? "" },
    create: { nameLower: name.toLowerCase(), note: parsed.data.note ?? "" },
  });

  logSystem("action", "admin", `reserved ID added: ${item.nameLower}`);
  return Response.json({ ok: true, reserved: item });
}

/** DELETE /api/admin/reserved?id= — remove a reserved ID */
export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) return jsonError("دسترسی غیرمجاز", 403);
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return jsonError("شناسه نامعتبر", 400);

  await db.reservedId.delete({ where: { id } }).catch(() => undefined);
  logSystem("action", "admin", `reserved ID removed: ${id}`);
  return Response.json({ ok: true });
}
