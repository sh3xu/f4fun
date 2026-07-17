import type {
  ColorGroup,
  GameAction,
  GameState,
  PlayerId,
  RNG,
} from "@f4fun/monopoly-engine";

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
   * Blocks re-offer only while the partner's trade conditions are unchanged;
   * cleared at the start of the bot's next PRE_ROLL turn.
   */
  rejectedTradeLocks?: ReadonlySet<string>;
}

export interface StrategyProfile {
  readonly id: string;
  scoreOptions(ctx: StrategyContext): ScoredOption[];
  generateTradeProposals(ctx: StrategyContext): GameAction[];
  minimumCashBuffer(ctx: StrategyContext): number;
}

export type { ColorGroup };
