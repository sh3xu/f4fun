import { z } from "zod";

export const PlayerInfoSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(24),
  token: z.string(),
  isHost: z.boolean(),
  isConnected: z.boolean(),
});

export type PlayerInfo = z.infer<typeof PlayerInfoSchema>;

export const RoomCreateSchema = z.object({
  playerName: z.string().min(1).max(24),
  token: z.string().min(1),
});

export const RoomJoinSchema = z.object({
  roomCode: z.string().length(6),
  playerName: z.string().min(1).max(24),
  token: z.string().min(1),
});

export const RoomStartGameSchema = z.object({
  roomCode: z.string().length(6),
});

export const RoomCreatedSchema = z.object({
  roomCode: z.string().length(6),
  roomId: z.string(),
  players: z.array(PlayerInfoSchema),
});

export const RoomPlayerJoinedSchema = z.object({
  player: PlayerInfoSchema,
});

export const RoomPlayerLeftSchema = z.object({
  playerId: z.string(),
  isConnected: z.boolean(),
});

export const RoomGameStartedSchema = z.object({
  gameId: z.string(),
  roomCode: z.string().length(6),
});

export const RoomErrorSchema = z.object({
  message: z.string(),
});

export type RoomCreatePayload = z.infer<typeof RoomCreateSchema>;
export type RoomJoinPayload = z.infer<typeof RoomJoinSchema>;
export type RoomStartGamePayload = z.infer<typeof RoomStartGameSchema>;
export type RoomCreatedPayload = z.infer<typeof RoomCreatedSchema>;
export type RoomPlayerJoinedPayload = z.infer<typeof RoomPlayerJoinedSchema>;
export type RoomPlayerLeftPayload = z.infer<typeof RoomPlayerLeftSchema>;
export type RoomGameStartedPayload = z.infer<typeof RoomGameStartedSchema>;
export type RoomErrorPayload = z.infer<typeof RoomErrorSchema>;
