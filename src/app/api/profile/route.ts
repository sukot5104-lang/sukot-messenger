import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, publicUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { profileSchema, firstZodError } from "@/lib/validate";

/** PUT /api/profile — update my profile */
export async function PUT(req: NextRequest) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);

    const body = await req.json().catch(() => null);
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

    const updated = await db.user.update({
      where: { id: me.id },
      data: {
        ...(parsed.data.displayName ? { displayName: parsed.data.displayName } : {}),
        ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio } : {}),
        ...(parsed.data.avatarColor ? { avatarColor: parsed.data.avatarColor } : {}),
      },
    });

    return Response.json({ ok: true, user: publicUser(updated) });
  } catch {
    return jsonError("خطای سرور", 500);
  }
}
