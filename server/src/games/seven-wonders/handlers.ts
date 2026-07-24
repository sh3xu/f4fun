import {
  applyAction,
  type GameEvent,
  type GameState,
  getPublicStateForPlayer,
  ResolveTurnError,
} from "@f4fun/seven-wonders-engine";
import {
  SevenWondersPlayFromDiscardSchema,
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
  events: readonly GameEvent[] = [],
): void {
  const sockets = io.sockets.adapter.rooms.get(roomId);
  if (!sockets) return;

  const payloadEvents = events.length > 0 ? [...events] : undefined;

  for (const socketId of sockets) {
    const sock = io.sockets.sockets.get(socketId) as
      | SocketWithPlayer
      | undefined;
    if (!sock?.playerId) continue;
    if (!state.players[sock.playerId]) continue;
    sock.emit("sevenWonders:stateSnapshot", {
      state: getPublicStateForPlayer(state, sock.playerId),
      ...(payloadEvents ? { events: payloadEvents } : {}),
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

        try {
          const { state: next, events } = applyAction(state, {
            type: "SUBMIT_PICK",
            playerId,
            action: data.action,
            cardId: data.cardId,
            ...(data.useFreeBuild ? { useFreeBuild: true } : {}),
          });

          const turnResolved =
            Object.keys(next.pendingPicks).length === 0 &&
            next.phase !== "RESOLVING_ABILITY";
          await saveGame(next.gameId, next, turnResolved ? 1 : 0);

          const submittedCount = Object.keys(next.pendingPicks).length;
          io.to(roomId).emit("sevenWonders:pickReceived", {
            playerId,
            submittedCount,
            totalPlayers: next.turnOrder.length,
          });

          emitPerPlayerSnapshots(io, roomId, next, events);
          callback(null, { ok: true });
        } catch (err) {
          // NOTE: Persist cleared queue so a mid-resolve failure cannot deadlock the draft.
          if (err instanceof ResolveTurnError) {
            await saveGame(err.clearedState.gameId, err.clearedState);
            emitPerPlayerSnapshots(io, roomId, err.clearedState);
          }
          throw err;
        }
      });
    } catch (err) {
      callback((err as Error).message);
    }
  });

  socket.on("sevenWonders:playFromDiscard", async (payload, callback) => {
    const data = validatePayload(SevenWondersPlayFromDiscardSchema)(
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

        const { state: next, events } = applyAction(state, {
          type: "PLAY_FROM_DISCARD",
          playerId,
          cardId: data.cardId,
        });

        const turnResolved =
          Object.keys(next.pendingPicks).length === 0 &&
          next.phase !== "RESOLVING_ABILITY";
        await saveGame(next.gameId, next, turnResolved ? 1 : 0);
        emitPerPlayerSnapshots(io, roomId, next, events);
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
