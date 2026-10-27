import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/config";
import { cookieOptions } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions(req), maxAge: 0 });
  return res;
}
