import type {
  ColorGroup,
  GameAction,
  GameState,
  PlayerId,
  RNG,
} from "@f4fun/monopoly-engine";
import type { BotPersonality } from "./personality.js";

export interface ScoredOption {
  action: GameAction;
  score: number;
  reasoning: string;
}

export interface StrategyContext {
  state: GameState;
  actorId: PlayerId;
  legalActions: GameAction[];
  rng: RNG;
  /**
   * Rejected deal locks (`fingerprint::partnerCondition`).
   * Blocks re-offer while the partner's deeds + cash band are unchanged;
   * cleared at the start of the bot's next PRE_ROLL turn.
   */
  rejectedTradeLocks?: ReadonlySet<string>;
  /** Auction / risk personality; defaults to balanced when omitted. */
  personality?: BotPersonality;
}

export interface StrategyProfile {
  readonly id: string;
  scoreOptions(ctx: StrategyContext): ScoredOption[];
  generateTradeProposals(ctx: StrategyContext): GameAction[];
  minimumCashBuffer(ctx: StrategyContext): number;
}

export type { ColorGroup };
