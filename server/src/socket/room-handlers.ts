import { randomBytes } from "node:crypto";
import {
  createInitialState,
  stampActionDeadline,
} from "@f4fun/monopoly-engine";
import {
  RoomAddBotPlayerSchema,
  RoomCreateSchema,
  RoomJoinSchema,
  RoomStartGameSchema,
  RoomSyncSchema,
} from "@f4fun/shared-types";
import type { Server } from "socket.io";
import { afterGameStateCommit } from "../games/monopoly/DeadlineTimers.js";
import { createGame, generateGameId } from "../games/monopoly/GameStore.js";
import { cancelGrace } from "../rooms/DisconnectGrace.js";
import {
  addBotPlayer,
  createRoom,
  generatePlayerSecret,
  getRoom,
  getRoomByCode,
  joinRoom,
  setPlayerConnected,
  setRoomGameStarted,
  verifyPlayerSession,
} from "../rooms/RoomManager.js";
import type { SocketWithPlayer } from "./middleware.js";
import { validatePayload } from "./middleware.js";

function generatePlayerId(): string {
  return randomBytes(8).toString("hex");
}

function toPlayerInfoList(
  players: Array<{
    playerId: string;
    name: string;
    token: string;
    isHost: boolean;
    isConnected: boolean;
    isBot?: boolean;
  }>,
) {
  return players.map((p) => ({
    id: p.playerId,
    name: p.name,
    token: p.token,
    isHost: p.isHost,
    isConnected: p.isConnected,
    isBot: p.isBot ?? false,
  }));
}

export function registerRoomHandlers(
  io: Server,
  socket: SocketWithPlayer,
): void {
  socket.on("room:create", async (payload, callback) => {
    const data = validatePayload(RoomCreateSchema)(payload, callback);
    if (!data) return;

    try {
      const playerId = generatePlayerId();
      const playerSecret = generatePlayerSecret();
      const room = await createRoom(
        playerId,
        data.playerName,
        data.token,
        playerSecret,
      );

      socket.playerId = playerId;
      socket.roomId = room.roomId;
      await socket.join(room.roomId);

      callback(null, {
        roomCode: room.code,
        roomId: room.roomId,
        playerId,
        playerSecret,
        players: toPlayerInfoList(room.players),
      });
    } catch (err) {
      callback((err as Error).message);
    }
  });

  socket.on("room:join", async (payload, callback) => {
    const data = validatePayload(RoomJoinSchema)(payload, callback);
    if (!data) return;

    try {
      const playerId = generatePlayerId();
      const playerSecret = generatePlayerSecret();

      const room = await joinRoom(
        data.roomCode,
        playerId,
        data.playerName,
        data.token,
        playerSecret,
      );
      socket.playerId = playerId;
      socket.roomId = room.roomId;
      await socket.join(room.roomId);

      await cancelGrace(room.roomId, playerId);

      const playerInfo = {
        id: playerId,
        name: data.playerName,
        token: data.token,
        isHost:
          room.players.find((p) => p.playerId === playerId)?.isHost || false,
        isConnected: true,
        isBot: false,
      };

      callback(null, {
        roomCode: room.code,
        roomId: room.roomId,
        playerId,
        playerSecret,
        players: toPlayerInfoList(room.players),
      });

      socket.to(room.roomId).emit("room:playerJoined", { player: playerInfo });
    } catch (err) {
      callback((err as Error).message);
    }
  });

  socket.on("room:sync", async (payload, callback) => {
    const data = validatePayload(RoomSyncSchema)(payload, callback);
    if (!data) return;

    try {
      const room = await getRoomByCode(data.roomCode);
      if (!room) {
        callback("Room not found");
        return;
      }

      if (room.status !== "lobby") {
        callback("Game already started");
        return;
      }

      if (data.playerId && data.playerSecret) {
        const verified = await verifyPlayerSession(
          room.roomId,
          data.playerId,
          data.playerSecret,
        );
        if (verified) {
          socket.playerId = data.playerId;
          socket.roomId = room.roomId;
          await socket.join(room.roomId);
          await setPlayerConnected(room.roomId, data.playerId, true);
          await cancelGrace(room.roomId, data.playerId);
        }
      }

      callback(null, {
        roomId: room.roomId,
        roomCode: room.code,
        players: toPlayerInfoList(room.players),
      });
    } catch (err) {
      callback((err as Error).message);
    }
  });

  socket.on("room:addBotPlayer", async (payload, callback) => {
    const data = validatePayload(RoomAddBotPlayerSchema)(payload, callback);
    if (!data) return;

    try {
      const room = await getRoom(socket.roomId || "");
      if (!room) {
        callback("Room not found");
        return;
      }

      if (socket.playerId !== room.hostId) {
        callback("Only host can add AI players");
        return;
      }

      if (room.status !== "lobby") {
        callback("Game already started");
        return;
      }

      const updated = await addBotPlayer(room.roomId);
      const botPlayer = updated.players[updated.players.length - 1];
      if (!botPlayer) {
        callback("Failed to add AI player");
        return;
      }

      const playerInfo = {
        id: botPlayer.playerId,
        name: botPlayer.name,
        token: botPlayer.token,
        isHost: false,
        isConnected: true,
        isBot: true,
      };

      callback(null, { players: toPlayerInfoList(updated.players) });
      socket.to(room.roomId).emit("room:playerJoined", { player: playerInfo });
    } catch (err) {
      callback((err as Error).message);
    }
  });

  socket.on("room:startGame", async (payload, callback) => {
    const data = validatePayload(RoomStartGameSchema)(payload, callback);
    if (!data) return;

    try {
      const room = await getRoom(socket.roomId || "");
      if (!room) {
        callback("Room not found");
        return;
      }

      if (socket.playerId !== room.hostId) {
        callback("Only host can start game");
        return;
      }

      if (room.players.length < 2) {
        callback("Need at least 2 players");
        return;
      }

      const gameId = generateGameId();
      const playerConfigs = room.players
        .filter((p) => p.isConnected)
        .map((p) => ({
          id: p.playerId,
          name: p.name,
          token: p.token,
        }));

      const initialState = createInitialState(gameId, playerConfigs);
      stampActionDeadline(initialState);
      console.log(
        `[Server] Created game ${gameId} with ${playerConfigs.length} players`,
      );

      await createGame(room.roomId, initialState);
      await setRoomGameStarted(room.roomId, gameId);

      console.log(
        `[Server] Emitting room:gameStarted and game:stateSnapshot to room ${room.roomId}`,
      );

      io.to(room.roomId).emit("room:gameStarted", {
        gameId,
        roomCode: room.code,
      });

      io.to(room.roomId).emit("game:stateSnapshot", { state: initialState });
      afterGameStateCommit(io, room.roomId, initialState);

      callback(null, { gameId });
    } catch (err) {
      console.error("[Server] room:startGame error:", err);
      callback((err as Error).message);
    }
  });
}
