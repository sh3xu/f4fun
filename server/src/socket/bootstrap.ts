import type { Server as HttpServer } from "node:http";
import type { GameState } from "@f4fun/monopoly-engine";
import { GameRejoinSchema } from "@f4fun/shared-types";
import { Server } from "socket.io";
import {
  afterGameStateCommit,
  ensureTradeExpiries,
  mergeGameConfig,
} from "../games/monopoly/DeadlineTimers.js";
import { getGameEventLog } from "../games/monopoly/GameEventLogger.js";
import { loadGame, saveGame } from "../games/monopoly/GameStore.js";
import { registerMonopolyHandlers } from "../games/monopoly/handlers.js";
import { withRoomLock } from "../games/monopoly/roomMutex.js";
import { cancelGrace, startGrace } from "../rooms/DisconnectGrace.js";
import { destroyRoomIfAbandoned } from "../rooms/RoomCleanup.js";
import {
  setPlayerConnected,
  verifyPlayerSession,
} from "../rooms/RoomManager.js";
import type { SocketWithPlayer } from "./middleware.js";
import { validatePayload } from "./middleware.js";
import { registerRoomHandlers } from "./room-handlers.js";

const DISCONNECT_GRACE_SECS = Number(process.env.DISCONNECT_GRACE_SECS ?? 300);

function parseCorsOrigins(value: string | undefined): string[] {
  return (value || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: parseCorsOrigins(process.env.CORS_ORIGIN),
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
        await cancelGrace(data.roomId, data.playerId);

        if (room.gameId) {
          // NOTE: Snapshot emit + timer arm must stay inside the room lock so a
          // concurrent action cannot deliver newer events first, then get
          // overwritten by this older snapshot / stale afterGameStateCommit.
          await withRoomLock(data.roomId, async () => {
            const state = await loadGame(room.gameId as string);
            if (!state) return;

            if (state.auction === undefined) state.auction = null;
            if (state.pendingTrades === undefined) state.pendingTrades = [];
            if (state.actionDeadlineAt === undefined) {
              state.actionDeadlineAt = null;
            }
            if (state.actionDeadlinePausedMs === undefined) {
              state.actionDeadlinePausedMs = null;
            }
            mergeGameConfig(state);
            const backfilled = ensureTradeExpiries(state);
            if (backfilled) {
              await saveGame(state.gameId, state, 0);
            }
            const rejoinState = state as GameState;
            const eventLog = await getGameEventLog(rejoinState.gameId, 0, 500);
            socket.emit("game:stateSnapshot", { state: rejoinState, eventLog });
            // NOTE: Rejoin re-arms in-memory timers after server restart / cold room.
            afterGameStateCommit(io, data.roomId, rejoinState);
          });
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
        // NOTE: Wait until every seat is offline and no reconnect grace remains.
        await destroyRoomIfAbandoned(roomId);
      });
    });
  });

  return io;
}
