import { z } from "zod";
import { db } from "@/lib/db";
import { PROTECTED_BRAND_MARKER } from "@/lib/config";

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export interface UsernameCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Brand impersonation detection — catches lookalikes of the official "Sukot" ID:
 * su_kot, suk0t, 5ukot, s.u.k.o.t, sukot-official, SUKOT2 ... (case-insensitive)
 */
export function isBrandImpersonation(lowerUsername: string): boolean {
  const normalized = lowerUsername
    .replace(/[._\-]/g, "")
    .replace(/0/g, "o")
    .replace(/5/g, "s")
    .replace(/\$/g, "s")
    .replace(/4/g, "a")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/\|/g, "l");
  return normalized.includes(PROTECTED_BRAND_MARKER);
}

/**
 * Server-side username validation — the single source of truth.
 * Rules:
 *  - 3..20 chars, only letters (a-z/A-Z), digits and underscore
 *  - cannot contain the protected brand marker ("sukot" in any casing/spacing trick via regex)
 *  - cannot be in the ReservedId table
 *  - must be unique (case-insensitive, via usernameLower @unique)
 */
export async function checkUsername(
  raw: string,
  opts: { forSelfId?: string } = {}
): Promise<UsernameCheck> {
  const username = (raw || "").trim();

  if (!username) return { ok: false, reason: "آیدی الزامی است" };
  if (!USERNAME_REGEX.test(username))
    return {
      ok: false,
      reason: "آیدی باید ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی، عدد و _ باشد",
    };

  const lower = username.toLowerCase();

  // Brand protection: nobody (except the official seeded account) may use anything
  // resembling "sukot" — blocks lookalikes like Sukot_, su_kot, suk0t, SUKOT1, etc.
  if (lower.includes(PROTECTED_BRAND_MARKER) || isBrandImpersonation(lower)) {
    return { ok: false, reason: "این آیدی محافظت‌شده است و قابل ثبت نیست" };
  }

  const reserved = await db.reservedId.findUnique({
    where: { nameLower: lower },
  });
  if (reserved)
    return { ok: false, reason: "این آیدی رزروشده است و قابل ثبت نیست" };

  const taken = await db.user.findUnique({ where: { usernameLower: lower } });
  if (taken && taken.id !== opts.forSelfId) {
    if (taken.deletedAt)
      return { ok: false, reason: "این آیدی رزروشده است و قابل ثبت نیست" };
    return { ok: false, reason: "این آیدی قبلاً ثبت شده است" };
  }

  return { ok: true };
}

export const registerSchema = z.object({
  username: z.string().min(1).max(20),
  displayName: z.string().trim().min(1, "نام نمایشی الزامی است").max(30),
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد").max(72),
});

export const loginSchema = z.object({
  username: z.string().min(1).max(20),
  password: z.string().min(1).max(72),
});

export const messageSendSchema = z.object({
  conversationId: z.string().min(1).max(64),
  content: z.string().trim().min(1, "پیام خالی است").max(4000),
});

export const startConversationSchema = z.object({
  username: z.string().min(1).max(20),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(30).optional(),
  bio: z.string().trim().max(160).optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "رنگ نامعتبر است")
    .optional(),
});

export const reportSchema = z.object({
  username: z.string().min(1).max(20),
  reason: z.enum(["spam", "harassment", "impersonation", "illegal", "other"]),
  details: z.string().trim().max(500).optional().default(""),
});

export const blockSchema = z.object({
  username: z.string().min(1).max(20),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(72),
});

export const adminUserActionSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["ban", "unban", "verify", "unverify", "delete", "free"]),
  reason: z.string().max(200).optional().default(""),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1).max(72),
});

export const adminReservedSchema = z.object({
  name: z.string().min(1).max(20),
  note: z.string().max(100).optional().default(""),
});

export const adminSettingsSchema = z.object({
  id_delete_policy: z.enum(["release", "reserve"]),
});

/** First zod error → Persian message */
export function firstZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message || "ورودی نامعتبر است";
}
