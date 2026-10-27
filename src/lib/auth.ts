import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  JWT_SECRET,
  SESSION_COOKIE,
  ADMIN_COOKIE,
} from "@/lib/config";

export interface SessionPayload {
  uid: string;
}

export function signSession(uid: string): string {
  return jwt.sign({ uid }, JWT_SECRET, { expiresIn: "30d" });
}

export function signAdminSession(): string {
  return jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "12h" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (typeof payload.uid !== "string") return null;
    return { uid: payload.uid };
  } catch {
    return null;
  }
}

export function verifyAdminSession(token: string): boolean {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function readCookieFromRequest(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  return parseCookies(header)[name] ?? null;
}

/** Returns the authenticated user (or null). Rejects banned & deleted accounts. */
export async function getAuthUser(req: Request) {
  const token = readCookieFromRequest(req, SESSION_COOKIE);
  if (!token) return null;
  const session = verifySession(token);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.uid } });
  if (!user || user.deletedAt || user.isBanned) return null;
  return user;
}

export function isAdminRequest(req: Request): boolean {
  const token = readCookieFromRequest(req, ADMIN_COOKIE);
  if (!token) return false;
  return verifyAdminSession(token);
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 12);
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

/** Public-safe user shape (never leaks password hash) */
export function publicUser(u: {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarColor: string;
  isVerified: boolean;
  isAdmin: boolean;
  lastSeen: Date | string;
  createdAt: Date | string;
}) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    avatarColor: u.avatarColor,
    isVerified: u.isVerified,
    isAdmin: u.isAdmin,
    lastSeen: u.lastSeen instanceof Date ? u.lastSeen.toISOString() : u.lastSeen,
    createdAt:
      u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
  };
}
