import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    console.log(
      "[Socket] Creating new socket.io client pointing to",
      SOCKET_URL,
    );
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => {
      console.log("[Socket] ✓ Connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] ✗ Disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] ✗ Connection error:", err.message);
    });
  }

  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    console.log("[Socket] connectSocket() called, connecting...");
    s.connect();
  } else {
    console.log("[Socket] connectSocket() called but already connected");
  }
}

export function disconnectSocket(): void {
  if (socket) {
    console.log("[Socket] Disconnecting...");
    socket.disconnect();
  }
}

export function emitWithCallback<T = unknown>(
  event: string,
  payload: unknown,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    if (!s.connected) {
      console.warn(
        `[Socket] emitWithCallback("${event}") - socket not connected!`,
      );
    }
    console.log(`[Socket] Emitting "${event}"`, payload);
    s.emit(event, payload, (error: string | null, data?: T) => {
      if (error) {
        console.error(`[Socket] Error response to "${event}":`, error);
        reject(new Error(error));
      } else {
        console.log(`[Socket] Success response to "${event}":`, data);
        resolve(data as T);
      }
    });
  });
}
