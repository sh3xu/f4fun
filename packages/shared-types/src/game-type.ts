import { z } from "zod";

export const GAME_TYPES = ["monopoly", "sevenWonders"] as const;

export const GameTypeSchema = z.enum(GAME_TYPES);
export type GameType = (typeof GAME_TYPES)[number];

export const DEFAULT_GAME_TYPE: GameType = "monopoly";
