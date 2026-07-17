import { randomBytes } from "node:crypto";
import { type IRoomPlayer, RoomModel } from "../db/index.js";
import type { RoomStatus } from "../db/schemas/RoomSchema.js";

export interface RoomPlayer {
  playerId: string;
  name: string;
  token: string;
  isHost: boolean;
  isConnected: boolean;
  isBot: boolean;
}

export interface Room {
  roomId: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  players: RoomPlayer[];
  gameId: string | null;
}

const MAX_ROOM_PLAYERS = 8;

function generateRoomCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

function generateId(): string {
  return randomBytes(8).toString("hex");
}

export function generatePlayerSecret(): string {
  return randomBytes(24).toString("hex");
}

export async function createRoom(
  playerId: string,
  name: string,
  token: string,
  playerSecret: string,
): Promise<Room> {
  const roomId = generateId();
  const code = generateRoomCode();

  const player: IRoomPlayer = {
    playerId,
    name,
    token,
    playerSecret,
    isHost: true,
    isConnected: true,
    isBot: false,
    joinedAt: new Date(),
  };

  const doc = await RoomModel.create({
    roomId,
    code,
    hostId: playerId,
    status: "lobby",
    players: [player],
    gameId: null,
  });

  return docToRoom(doc);
}

export async function joinRoom(
  code: string,
  playerId: string,
  name: string,
  token: string,
  playerSecret: string,
): Promise<Room> {
  const doc = await RoomModel.findOne({ code: code.toUpperCase() });
  if (!doc) throw new Error("Room not found");
  if (doc.status !== "lobby") throw new Error("Game already started");

  const existing = doc.players.find((p) => p.playerId === playerId);
  if (existing) {
    if (existing.playerSecret !== playerSecret) {
      throw new Error("Invalid player credentials");
    }
    existing.isConnected = true;
    await doc.save();
    return docToRoom(doc);
  }

  if (doc.players.length >= MAX_ROOM_PLAYERS) throw new Error("Room is full");

  doc.players.push({
    playerId,
    name,
    token,
    playerSecret,
    isHost: false,
    isConnected: true,
    isBot: false,
    joinedAt: new Date(),
  });

  await doc.save();
  return docToRoom(doc);
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const doc = await RoomModel.findOne({ roomId });
  return doc ? docToRoom(doc) : null;
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const doc = await RoomModel.findOne({ code: code.toUpperCase() });
  return doc ? docToRoom(doc) : null;
}

export async function setRoomGameStarted(
  roomId: string,
  gameId: string,
): Promise<void> {
  await RoomModel.updateOne(
    { roomId },
    { $set: { status: "playing", gameId } },
  );
}

export async function setRoomFinished(roomId: string): Promise<void> {
  await RoomModel.updateOne({ roomId }, { $set: { status: "finished" } });
}

export async function setPlayerConnected(
  roomId: string,
  playerId: string,
  isConnected: boolean,
): Promise<void> {
  await RoomModel.updateOne(
    { roomId, "players.playerId": playerId },
    { $set: { "players.$.isConnected": isConnected } },
  );
}

export async function allPlayersDisconnected(roomId: string): Promise<boolean> {
  const doc = await RoomModel.findOne({ roomId });
  if (!doc || doc.players.length === 0) return true;
  return doc.players.filter((p) => !p.isBot).every((p) => !p.isConnected);
}

/**
 * Atomically delete the room only if every player is still disconnected.
 * Returns false if someone reconnected (or the room is already gone).
 */
export async function deleteRoomIfAbandoned(roomId: string): Promise<boolean> {
  const result = await RoomModel.findOneAndDelete({
    roomId,
    // NOTE: Fail if any human seat reconnected since the abandonment check.
    players: {
      $not: {
        $elemMatch: {
          isBot: { $ne: true },
          isConnected: true,
        },
      },
    },
  });
  return result !== null;
}

export async function deleteRoom(roomId: string): Promise<boolean> {
  const result = await RoomModel.deleteOne({ roomId });
  return result.deletedCount > 0;
}

export async function getRoomByPlayerId(
  playerId: string,
): Promise<Room | null> {
  const doc = await RoomModel.findOne({
    "players.playerId": playerId,
    status: { $in: ["lobby", "playing"] },
  });
  return doc ? docToRoom(doc) : null;
}

/** Verifies player owns this seat; returns room only when secret and roomId match. */
export async function verifyPlayerSession(
  roomId: string,
  playerId: string,
  playerSecret: string,
): Promise<Room | null> {
  const doc = await RoomModel.findOne({
    roomId,
    players: {
      $elemMatch: {
        playerId,
        playerSecret,
      },
    },
    status: { $in: ["lobby", "playing"] },
  });
  return doc ? docToRoom(doc) : null;
}

const BOT_TOKENS = [
  "memo_1",
  "memo_2",
  "memo_3",
  "memo_4",
  "memo_5",
  "memo_6",
  "memo_7",
  "memo_8",
] as const;

export async function addBotPlayer(roomId: string): Promise<Room> {
  const doc = await RoomModel.findOne({ roomId });
  if (!doc) throw new Error("Room not found");
  if (doc.status !== "lobby") throw new Error("Game already started");
  if (doc.players.length >= MAX_ROOM_PLAYERS) throw new Error("Room is full");

  const usedTokens = new Set(doc.players.map((p) => p.token));
  const token =
    BOT_TOKENS.find((t) => !usedTokens.has(t)) ??
    BOT_TOKENS[doc.players.length % BOT_TOKENS.length];
  const botCount = doc.players.filter((p) => p.isBot).length + 1;
  const playerId = generateId();
  const playerSecret = generatePlayerSecret();

  const botPlayer: IRoomPlayer = {
    playerId,
    name: `AI Player ${botCount}`,
    token,
    playerSecret,
    isHost: false,
    isConnected: true,
    isBot: true,
    joinedAt: new Date(),
  };

  const updated = await RoomModel.findOneAndUpdate(
    {
      roomId,
      status: "lobby",
      "players.7": { $exists: false },
    },
    { $push: { players: botPlayer } },
    { new: true },
  );
  if (!updated) {
    const current = await RoomModel.findOne({ roomId });
    if (!current) throw new Error("Room not found");
    if (current.status !== "lobby") throw new Error("Game already started");
    if (current.players.length >= MAX_ROOM_PLAYERS) {
      throw new Error("Room is full");
    }
    throw new Error("Failed to add AI player");
  }

  return docToRoom(updated);
}

export async function getBotPlayerIds(roomId: string): Promise<string[]> {
  const doc = await RoomModel.findOne({ roomId });
  if (!doc) return [];
  return doc.players.filter((p) => p.isBot).map((p) => p.playerId);
}

function docToRoom(doc: Awaited<ReturnType<typeof RoomModel.findOne>>): Room {
  if (!doc) throw new Error("Null doc");
  return {
    roomId: doc.roomId,
    code: doc.code,
    hostId: doc.hostId,
    status: doc.status,
    players: doc.players.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      token: p.token,
      isHost: p.isHost,
      isConnected: p.isConnected,
      isBot: p.isBot ?? false,
    })),
    gameId: doc.gameId,
  };
}
