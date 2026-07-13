import type { Server as HttpServer } from "node:http";
import { GameRejoinSchema } from "@f4fun/shared-types";
import { Server } from "socket.io";
import { loadGame } from "../games/monopoly/GameStore.js";
import { registerMonopolyHandlers } from "../games/monopoly/handlers.js";
import { startGrace } from "../rooms/DisconnectGrace.js";
import {
  setPlayerConnected,
  verifyPlayerSession,
} from "../rooms/RoomManager.js";
import type { SocketWithPlayer } from "./middleware.js";
import { validatePayload } from "./middleware.js";
import { registerRoomHandlers } from "./room-handlers.js";

const DISCONNECT_GRACE_SECS = Number(process.env.DISCONNECT_GRACE_SECS ?? 60);

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: DISCONNECT_GRACE_SECS * 1000,
      skipMiddlewares: true,
    },
  });

  io.on("connection", (socket) => {
    const s = socket as SocketWithPlayer;
    console.log(`[Socket] Connected: ${socket.id}`);

    registerRoomHandlers(io, s);
    registerMonopolyHandlers(io, s);

    socket.on("game:rejoin", async (payload, callback) => {
      const data = validatePayload(GameRejoinSchema)(payload, callback);
      if (!data) return;

      try {
        const room = await verifyPlayerSession(
          data.roomId,
          data.playerId,
          data.playerSecret,
        );
        if (!room) {
          callback?.("Invalid session");
          return;
        }

        s.playerId = data.playerId;
        s.roomId = data.roomId;
        await socket.join(data.roomId);

        await setPlayerConnected(data.roomId, data.playerId, true);

        if (room.gameId) {
          const state = await loadGame(room.gameId);
          if (state) {
            socket.emit("game:stateSnapshot", { state });
          }
        }

        socket.to(data.roomId).emit("room:playerJoined", {
          player: {
            id: data.playerId,
            name:
              room.players.find((p) => p.playerId === data.playerId)?.name ??
              "",
            token:
              room.players.find((p) => p.playerId === data.playerId)?.token ??
              "",
            isHost: room.hostId === data.playerId,
            isConnected: true,
          },
        });

        callback?.(null, { ok: true });
      } catch (err) {
        callback?.((err as Error).message);
      }
    });

    socket.on("disconnect", async () => {
      const playerId = s.playerId;
      const roomId = s.roomId;
      console.log(`[Socket] Disconnected: ${socket.id} player=${playerId}`);

      if (!playerId || !roomId) return;

      await setPlayerConnected(roomId, playerId, false);
      socket.to(roomId).emit("room:playerLeft", {
        playerId,
        isConnected: false,
      });

      startGrace(roomId, playerId, DISCONNECT_GRACE_SECS, async () => {
        console.log(`[Grace] Expired for player=${playerId} room=${roomId}`);
        socket.to(roomId).emit("room:playerLeft", {
          playerId,
          isConnected: false,
        });
      });
    });
  });

  return io;
}
