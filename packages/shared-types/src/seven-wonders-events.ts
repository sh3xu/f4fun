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
});

export const SevenWondersRejoinSchema = z.object({
  roomId: z.string().min(1),
  playerId: z.string().min(1),
  playerSecret: z.string().min(1),
});

export const SevenWondersStateSnapshotSchema = z.object({
  state: z.unknown(),
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
