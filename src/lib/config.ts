// SUKOT MESSENGER — Runtime configuration
// Values come from .env; fallbacks keep dev working. Keep fallbacks in sync with .env / .env.example.

export const JWT_SECRET =
  process.env.JWT_SECRET || "sukot-messenger-jwt-8f4a2c1e9b3d";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "SukotAdmin@2026";

export const INTERNAL_SECRET =
  process.env.INTERNAL_SECRET || "sukot-internal-5e7a9c1f";

export const CHAT_SERVICE_PORT = process.env.CHAT_SERVICE_PORT || "3003";
export const CHAT_INTERNAL_PORT = process.env.CHAT_INTERNAL_PORT || "3004";
export const CHAT_SERVICE_URL = `http://localhost:${CHAT_SERVICE_PORT}`;
export const CHAT_INTERNAL_URL = `http://localhost:${CHAT_INTERNAL_PORT}`;

export const SESSION_COOKIE = "sukot_session";
export const ADMIN_COOKIE = "sukot_admin";

// Default policy for IDs after account deletion: "reserve" | "release"
export const DEFAULT_ID_POLICY = process.env.ID_DELETE_POLICY || "reserve";

export const OFFICIAL_ID = "sukot"; // lowercase canonical form of the official account

// Any username containing this marker is rejected (anti-impersonation of the official brand)
export const PROTECTED_BRAND_MARKER = "sukot";
