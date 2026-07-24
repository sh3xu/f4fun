import { z } from "zod";

export const SevenWondersPickActionSchema = z.enum([
  "PLAY",
  "DISCARD",
  "STAGE_WONDER",
]);

export const SevenWondersSubmitPickSchema = z.object({
  roomId: z.string().min(1),
  action: SevenWondersPickActionSchema,
  cardId: z.string().min(1),
  useFreeBuild: z.boolean().optional(),
});

export const SevenWondersPlayFromDiscardSchema = z.object({
  roomId: z.string().min(1),
  cardId: z.string().min(1),
});

export const SevenWondersRejoinSchema = z.object({
  roomId: z.string().min(1),
  playerId: z.string().min(1),
  playerSecret: z.string().min(1),
});

// NOTE: Minimal GameState shape for socket snapshots — avoids importing the engine
// into shared-types (circular risk). Extra fields pass through via .passthrough().
export const SevenWondersScoreBreakdownSchema = z.object({
  military: z.number(),
  coins: z.number(),
  wonder: z.number(),
  civilian: z.number(),
  science: z.number(),
  commerce: z.number(),
  guild: z.number(),
  total: z.number(),
});

export const SevenWondersPlayerStateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    token: z.string(),
    coins: z.number(),
    wonderId: z.string(),
    wonderStagesBuilt: z.number().int().nonnegative(),
    tableau: z.array(z.string()),
    militaryTokens: z.array(z.number()),
    pendingAbility: z
      .union([
        z.object({ type: z.literal("freeBuild") }),
        z.object({ type: z.literal("playDiscarded") }),
      ])
      .nullable(),
  })
  .passthrough();

export const SevenWondersPendingPickSchema = z.object({
  action: SevenWondersPickActionSchema,
  cardId: z.string(),
  useFreeBuild: z.boolean().optional(),
});

export const SevenWondersGameStateSchema = z
  .object({
    gameId: z.string(),
    phase: z.enum(["DRAFTING", "RESOLVING_ABILITY", "GAME_OVER"]),
    age: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    passDirection: z.enum(["LEFT", "RIGHT"]),
    turnOrder: z.array(z.string()),
    players: z.record(z.string(), SevenWondersPlayerStateSchema),
    hands: z.record(z.string(), z.array(z.string())),
    discardPile: z.array(z.string()),
    pendingPicks: z.record(z.string(), SevenWondersPendingPickSchema),
    ageDecks: z.tuple([
      z.array(z.string()),
      z.array(z.string()),
      z.array(z.string()),
    ]),
    finalScores: z
      .record(z.string(), SevenWondersScoreBreakdownSchema)
      .optional(),
  })
  .passthrough();

export const SevenWondersStateSnapshotSchema = z.object({
  state: SevenWondersGameStateSchema,
});

export const SevenWondersPickReceivedSchema = z.object({
  playerId: z.string(),
  submittedCount: z.number().int().nonnegative(),
  totalPlayers: z.number().int().positive(),
});

export const SevenWondersErrorSchema = z.object({
  message: z.string(),
});

export type SevenWondersPickAction = z.infer<
  typeof SevenWondersPickActionSchema
>;
export type SevenWondersSubmitPickPayload = z.infer<
  typeof SevenWondersSubmitPickSchema
>;
export type SevenWondersPlayFromDiscardPayload = z.infer<
  typeof SevenWondersPlayFromDiscardSchema
>;
export type SevenWondersRejoinPayload = z.infer<
  typeof SevenWondersRejoinSchema
>;
export type SevenWondersStateSnapshotPayload = z.infer<
  typeof SevenWondersStateSnapshotSchema
>;
export type SevenWondersPickReceivedPayload = z.infer<
  typeof SevenWondersPickReceivedSchema
>;
export type SevenWondersErrorPayload = z.infer<typeof SevenWondersErrorSchema>;
