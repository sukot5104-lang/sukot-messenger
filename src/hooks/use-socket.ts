"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Singleton socket connection to the real-time chat service.
 * Caddy forwards requests containing XTransformPort=3003 to the chat service.
 * Authentication happens via the session cookie on the handshake.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1200,
      reconnectionDelayMax: 8000,
      timeout: 12000,
    });
  }
  return socket;
}

/** Force a fresh handshake (e.g. after login/logout when the cookie changed). */
export function resetSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
