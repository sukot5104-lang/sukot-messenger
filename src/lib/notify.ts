import { CHAT_INTERNAL_URL, INTERNAL_SECRET } from "@/lib/config";

/**
 * Fire-and-forget notification to the real-time chat service (socket.io mini service).
 * Used by REST endpoints to push events to connected clients
 * (e.g. "conversation:new" after registration, "force:logout" after ban).
 */
export function notifyChat(
  event: string,
  payload: unknown,
  rooms: string[]
): void {
  const url = `${CHAT_INTERNAL_URL}/internal/emit`;
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": INTERNAL_SECRET,
    },
    body: JSON.stringify({ event, payload, rooms }),
  }).catch(() => {
    // Chat service may be briefly unavailable; ignore — clients recover on refresh.
  });
}

export const ROOM_USER = (userId: string) => `user:${userId}`;
export const ROOM_CONV = (conversationId: string) => `conv:${conversationId}`;

/** Ask chat service for the list of currently-online user ids. */
export async function fetchOnlineUserIds(): Promise<string[]> {
  try {
    const res = await fetch(`${CHAT_INTERNAL_URL}/internal/online`, {
      headers: { "x-internal-secret": INTERNAL_SECRET },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { online?: string[] };
    return data.online ?? [];
  } catch {
    return [];
  }
}
