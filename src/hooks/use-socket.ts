"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const TOKEN_KEY = "sukot_token";

export function saveSocketToken(token: string | null | undefined): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function clearSocketToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Singleton socket connection to the real-time chat service.
 * Caddy forwards requests containing XTransformPort=3003 to the chat service.
 * Authentication: explicit JWT in handshake auth (primary) or session cookie (fallback).
 * transports order: polling first — more reliable behind proxies/firewalls,
 * then upgrades to websocket automatically.
 */
export function getSocket(): Socket {
  if (!socket) {
    let token: string | null = null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    socket = io("/?XTransformPort=3003", {
      transports: ["polling", "websocket"],
      auth: token ? { token } : {},
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1200,
      reconnectionDelayMax: 8000,
      timeout: 12000,
    });
    // debug handle (harmless in production)
    if (typeof window !== "undefined") {
      (window as unknown as { __sukotSocket?: Socket }).__sukotSocket = socket;
    }
  }
  return socket;
}

/** Force a fresh handshake (e.g. after login/logout when the credential changed). */
export function resetSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
