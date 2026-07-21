import { z } from "zod";

export const GameTypeSchema = z.enum(["monopoly", "sevenWonders"]);
export type GameType = z.infer<typeof GameTypeSchema>;

export const DEFAULT_GAME_TYPE: GameType = "monopoly";
