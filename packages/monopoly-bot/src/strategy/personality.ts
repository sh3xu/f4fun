export type BotPersonalityId =
  | "conservative"
  | "balanced"
  | "aggressive"
  | "denial"
  | "gambler";

export interface BotPersonality {
  id: BotPersonalityId;
  /** Multiplier on fair property value for max bid. */
  overpayMult: number;
  /** Multiplier on cash buffer reserve. */
  reserveMult: number;
  /** Weight for blocking opponent monopolies. */
  denialWeight: number;
  /** How large strategic jumps tend to be (0–1). */
  jumpAggressiveness: number;
  /** Chance of an irrational high bid. */
  gambleChance: number;
  /** Extra premium when completing / nearing own monopoly. */
  completionPremium: number;
}

/** NOTE: Mapped type keeps Record key and `id` field in lockstep. */
export const PERSONALITIES: {
  [K in BotPersonalityId]: BotPersonality & { id: K };
} = {
  conservative: {
    id: "conservative",
    overpayMult: 0.9,
    reserveMult: 1.5,
    denialWeight: 0.4,
    jumpAggressiveness: 0.3,
    gambleChance: 0,
    completionPremium: 1.0,
  },
  balanced: {
    id: "balanced",
    overpayMult: 1.05,
    reserveMult: 1.0,
    denialWeight: 0.8,
    jumpAggressiveness: 0.5,
    gambleChance: 0.02,
    completionPremium: 1.15,
  },
  aggressive: {
    id: "aggressive",
    overpayMult: 1.25,
    reserveMult: 0.7,
    denialWeight: 0.9,
    jumpAggressiveness: 0.75,
    gambleChance: 0.05,
    completionPremium: 1.4,
  },
  denial: {
    id: "denial",
    overpayMult: 1.15,
    reserveMult: 0.85,
    denialWeight: 1.6,
    jumpAggressiveness: 0.7,
    gambleChance: 0.03,
    completionPremium: 1.1,
  },
  gambler: {
    id: "gambler",
    overpayMult: 1.1,
    reserveMult: 0.6,
    denialWeight: 0.7,
    jumpAggressiveness: 0.85,
    gambleChance: 0.18,
    completionPremium: 1.2,
  },
};

const PERSONALITY_ORDER: BotPersonalityId[] = [
  "conservative",
  "balanced",
  "aggressive",
  "denial",
  "gambler",
];

/** Stable seat personality from player id (no lobby picker yet). */
export function personalityFromPlayerId(playerId: string): BotPersonality {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) >>> 0;
  }
  const id = PERSONALITY_ORDER[hash % PERSONALITY_ORDER.length];
  return PERSONALITIES[id];
}
