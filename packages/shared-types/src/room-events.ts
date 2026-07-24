import { z } from "zod";
import { GameTypeSchema } from "./game-type.js";

/** Human nicknames: letters and digits only (bots may use special chars). */
export const HumanPlayerNameSchema = z
  .string()
  .min(1)
  .max(16)
  .regex(/^[A-Za-z0-9]+$/, "Name may only contain letters and numbers");

export const PlayerInfoSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(24),
  token: z.string(),
  isHost: z.boolean(),
  isConnected: z.boolean(),
  isBot: z.boolean().default(false),
});

export type PlayerInfo = z.infer<typeof PlayerInfoSchema>;

export const RoomCreateSchema = z.object({
  playerName: HumanPlayerNameSchema,
  token: z.string().min(1),
});

export const RoomJoinSchema = z.object({
  roomCode: z.string().length(6),
  playerName: HumanPlayerNameSchema,
  token: z.string().min(1),
});

export const RoomStartGameSchema = z.object({
  roomCode: z.string().length(6),
  options: z
    .object({
      startingCash: z.number().int().min(500).max(2000).multipleOf(100),
      goSalary: z.number().int().min(50).max(500).multipleOf(50),
      bankHouseLimit: z
        .number()
        .int()
        .min(8)
        .max(32)
        .refine((n) => n % 8 === 0, {
          message: "bankHouseLimit must be a multiple of 8",
        }),
    })
    .optional(),
});

export const RoomSetGameTypeSchema = z.object({
  roomCode: z.string().length(6),
  gameType: GameTypeSchema,
});

export const RoomAddBotPlayerSchema = z.object({
  roomCode: z.string().length(6),
});

export const RoomSyncSchema = z.object({
  roomCode: z.string().length(6),
  playerId: z.string().optional(),
  playerSecret: z.string().min(1).optional(),
});

export const RoomAddBotPlayerResponseSchema = z.object({
  players: z.array(PlayerInfoSchema),
});

export const RoomCreatedSchema = z.object({
  roomCode: z.string().length(6),
  roomId: z.string(),
  playerId: z.string(),
  playerSecret: z.string().min(1),
  players: z.array(PlayerInfoSchema),
  gameType: GameTypeSchema,
});

export const RoomSyncedSchema = z.object({
  roomCode: z.string().length(6),
  roomId: z.string(),
  players: z.array(PlayerInfoSchema),
  gameType: GameTypeSchema,
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
  gameType: GameTypeSchema,
});

export const RoomGameTypeUpdatedSchema = z.object({
  gameType: GameTypeSchema,
  players: z.array(PlayerInfoSchema).optional(),
});

export const RoomErrorSchema = z.object({
  message: z.string(),
});

export type RoomCreatePayload = z.infer<typeof RoomCreateSchema>;
export type RoomJoinPayload = z.infer<typeof RoomJoinSchema>;
export type RoomStartGamePayload = z.infer<typeof RoomStartGameSchema>;
export type RoomSetGameTypePayload = z.infer<typeof RoomSetGameTypeSchema>;
export type RoomAddBotPlayerPayload = z.infer<typeof RoomAddBotPlayerSchema>;
export type RoomSyncPayload = z.infer<typeof RoomSyncSchema>;
export type RoomAddBotPlayerResponsePayload = z.infer<
  typeof RoomAddBotPlayerResponseSchema
>;
export type RoomCreatedPayload = z.infer<typeof RoomCreatedSchema>;
export type RoomSyncedPayload = z.infer<typeof RoomSyncedSchema>;
export type RoomPlayerJoinedPayload = z.infer<typeof RoomPlayerJoinedSchema>;
export type RoomPlayerLeftPayload = z.infer<typeof RoomPlayerLeftSchema>;
export type RoomGameStartedPayload = z.infer<typeof RoomGameStartedSchema>;
export type RoomGameTypeUpdatedPayload = z.infer<
  typeof RoomGameTypeUpdatedSchema
>;
export type RoomErrorPayload = z.infer<typeof RoomErrorSchema>;
