import type { Socket } from "socket.io";
import type { z } from "zod";

export interface SocketWithPlayer extends Socket {
  playerId?: string;
  roomId?: string;
}

export function validatePayload<T extends z.ZodTypeAny>(schema: T) {
  return (
    payload: unknown,
    callback?: (error: string | null, data?: z.infer<T>) => void,
  ): z.infer<T> | null => {
    // NOTE: Catch stale/missing package builds so a bad schema never kills the process
    if (!schema || typeof schema.safeParse !== "function") {
      const error =
        "Validation schema is missing — rebuild @f4fun/shared-types";
      console.error(`[Socket] ${error}`);
      if (callback) callback(error);
      return null;
    }
    const result = schema.safeParse(payload);
    if (!result.success) {
      const error = `Validation failed: ${result.error.errors.map((e) => e.message).join(", ")}`;
      if (callback) callback(error);
      return null;
    }
    return result.data;
  };
}

export function requirePlayer(socket: SocketWithPlayer): string | null {
  if (!socket.playerId) {
    return null;
  }
  return socket.playerId;
}

export function requireRoom(socket: SocketWithPlayer): string | null {
  if (!socket.roomId) {
    return null;
  }
  return socket.roomId;
}
