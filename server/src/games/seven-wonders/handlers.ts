import {
  applyAction,
  type GameState,
  getPublicStateForPlayer,
} from "@f4fun/seven-wonders-engine";
import {
  SevenWondersRejoinSchema,
  SevenWondersSubmitPickSchema,
} from "@f4fun/shared-types";
import type { Server } from "socket.io";
import {
  getRoom,
  setPlayerConnected,
  verifyPlayerSession,
} from "../../rooms/RoomManager.js";
import type { SocketWithPlayer } from "../../socket/middleware.js";
import { validatePayload } from "../../socket/middleware.js";
import { withRoomLock } from "../monopoly/roomMutex.js";
import { loadGame, saveGame } from "./GameStore.js";

/** Prefer targeted emits so each seat only gets its own hand. */
export function emitPerPlayerSnapshots(
  io: Server,
  roomId: string,
  state: GameState,
): void {
  const sockets = io.sockets.adapter.rooms.get(roomId);
  if (!sockets) return;

  for (const socketId of sockets) {
    const sock = io.sockets.sockets.get(socketId) as
      | SocketWithPlayer
      | undefined;
    if (!sock?.playerId) continue;
    if (!state.players[sock.playerId]) continue;
    sock.emit("sevenWonders:stateSnapshot", {
      state: getPublicStateForPlayer(state, sock.playerId),
    });
  }
}

export function registerSevenWondersHandlers(
  io: Server,
  socket: SocketWithPlayer,
): void {
  socket.on("sevenWonders:submitPick", async (payload, callback) => {
    const data = validatePayload(SevenWondersSubmitPickSchema)(
      payload,
      callback,
    );
    if (!data) return;

    try {
      const roomId = data.roomId;
      const playerId = socket.playerId;
      if (!playerId) {
        callback("Not authenticated");
        return;
      }

      await withRoomLock(roomId, async () => {
        const room = await getRoom(roomId);
        if (!room || room.gameType !== "sevenWonders" || !room.gameId) {
          callback("Seven Wonders game not found");
          return;
        }

        const state = await loadGame(room.gameId);
        if (!state) {
          callback("Game state not found");
          return;
        }

        const { state: next } = applyAction(state, {
          type: "SUBMIT_PICK",
          playerId,
          action: data.action,
          cardId: data.cardId,
        });

        const turnResolved = Object.keys(next.pendingPicks).length === 0;
        await saveGame(next.gameId, next, turnResolved ? 1 : 0);

        const submittedCount = Object.keys(next.pendingPicks).length;
        io.to(roomId).emit("sevenWonders:pickReceived", {
          playerId,
          submittedCount,
          totalPlayers: next.turnOrder.length,
        });

        emitPerPlayerSnapshots(io, roomId, next);
        callback(null, { ok: true });
      });
    } catch (err) {
      callback((err as Error).message);
    }
  });

  socket.on("sevenWonders:rejoin", async (payload, callback) => {
    const data = validatePayload(SevenWondersRejoinSchema)(payload, callback);
    if (!data) return;

    try {
      const room = await verifyPlayerSession(
        data.roomId,
        data.playerId,
        data.playerSecret,
      );
      if (!room || room.gameType !== "sevenWonders") {
        callback("Invalid session");
        return;
      }

      socket.playerId = data.playerId;
      socket.roomId = data.roomId;
      await socket.join(data.roomId);
      await setPlayerConnected(data.roomId, data.playerId, true);

      if (room.gameId) {
        await withRoomLock(data.roomId, async () => {
          const state = await loadGame(room.gameId as string);
          if (!state) return;
          socket.emit("sevenWonders:stateSnapshot", {
            state: getPublicStateForPlayer(state, data.playerId),
          });
        });
      }

      callback(null, { ok: true });
    } catch (err) {
      callback((err as Error).message);
    }
  });
}
