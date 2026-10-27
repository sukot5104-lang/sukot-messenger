import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export function jsonOk(data: object = {}) {
  return NextResponse.json({ ok: true, ...data });
}

export function jsonError(message: string, status = 400, extra: object = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function cookieOptions(req: Request) {
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (new URL(req.url).protocol === "https:" ? "https" : "http");
  const isHttps = proto.includes("https");
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: isHttps,
    path: "/",
  };
}

export async function getSetting(key: string, fallback: string): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}
