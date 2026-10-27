import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/config";
import { cookieOptions } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(req), maxAge: 0 });
  return res;
}
