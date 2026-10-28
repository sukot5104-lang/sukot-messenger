import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getAuthUser } from "@/lib/auth";
import { jsonError } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/** Detect real image type by magic bytes (never trust the client MIME). */
function detectExt(buf: Uint8Array): string | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  // GIF: GIF8
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif";
  // WEBP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  )
    return "webp";
  return null;
}

/** POST /api/upload — multipart form, field "file". Returns { ok, url } */
export async function POST(req: NextRequest) {
  try {
    const me = await getAuthUser(req);
    if (!me) return jsonError("احراز هویت نشده", 401);
    if (me.isBanned) return jsonError("حساب شما مسدود شده است", 403);

    const rl = rateLimit(`upload:${me.id}`, 10, 60_000);
    if (!rl.allowed)
      return jsonError("آپلود بیش از حد مجاز است، کمی صبر کنید", 429);

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return jsonError("فایلی ارسال نشده است", 400);
    if (file.size <= 0) return jsonError("فایل خالی است", 400);
    if (file.size > MAX_BYTES)
      return jsonError("حجم تصویر باید کمتر از ۵ مگابایت باشد", 413);

    const buf = new Uint8Array(await file.arrayBuffer());
    const ext = detectExt(buf);
    if (!ext)
      return jsonError("فقط تصاویر JPG، PNG، WEBP یا GIF مجاز هستند", 415);

    const name = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${name}.${ext}`), buf);

    return Response.json({ ok: true, url: `/uploads/${name}.${ext}` });
  } catch (e) {
    console.error("upload error:", e);
    return jsonError("خطا در آپلود تصویر", 500);
  }
}
