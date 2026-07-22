import {
  type GameAction,
  type GameState,
  getLegalActions,
  isActionDeadlineExpired,
  type PlayerId,
  type RNG,
  timeoutActionForState,
} from "@f4fun/monopoly-engine";
import { pickBestOption } from "../strategy/expertStrategy.js";
import { type BotPersonality, PERSONALITIES } from "../strategy/personality.js";
import type { StrategyProfile } from "../strategy/types.js";
import { rejectedDealLockKey } from "./tradeFingerprint.js";

export interface BotDecision {
  action: GameAction;
  reasoning: string;
}

export class BotPlayer {
  /**
   * Same-turn locks: deal fingerprint + partner condition at rejection (Issue #55).
   * Cleared at the start of the bot's next PRE_ROLL turn so deals may be retried later.
   */
  private readonly rejectedTradeLocks = new Set<string>();
  private readonly personality: BotPersonality;

  constructor(
    private readonly strategy: StrategyProfile,
    personality: BotPersonality = PERSONALITIES.balanced,
  ) {
    this.personality = personality;
  }

  getPersonality(): BotPersonality {
    return this.personality;
  }

  /**
   * Record a rejected deal for the partner's current conditions.
   * Same deal may be re-offered next turn, or mid-turn if the partner's deeds
   * change or cash crosses a drastic liquidity band (e.g. into low).
   */
  rememberRejectedTrade(fingerprint: string, partnerCondition: string): void {
    this.rejectedTradeLocks.add(
      rejectedDealLockKey(fingerprint, partnerCondition),
    );
  }

  hasRejectedTrade(fingerprint: string, partnerCondition: string): boolean {
    return this.rejectedTradeLocks.has(
      rejectedDealLockKey(fingerprint, partnerCondition),
    );
  }

  clearRejectedTrades(): void {
    this.rejectedTradeLocks.clear();
  }

  decide(
    state: GameState,
    actorId: PlayerId,
    legalActions?: GameAction[],
    rng: RNG = Math.random,
  ): BotDecision {
    // NOTE: New turn starts at PRE_ROLL with doublesCount 0; doubles reroll also
    // returns to PRE_ROLL but leaves doublesCount > 0 — keep rejection locks until then.
    if (state.phase === "PRE_ROLL" && state.doublesCount === 0) {
      this.rejectedTradeLocks.clear();
    }

    // NOTE: Issue #55 — turn timer wins over bot intent once the deadline has elapsed.
    if (isActionDeadlineExpired(state)) {
      const timed = timeoutActionForState(state);
      if (timed && timed.actorId === actorId) {
        return {
          action: timed.action,
          reasoning: `Timer expired — auto ${timed.action.type}`,
        };
      }
    }

    let actions = legalActions ?? getLegalActions(state, actorId);
    if (
      actions.length === 0 &&
      state.phase === "RAISE_CASH" &&
      state.pendingDebt?.playerId === actorId
    ) {
      actions = [{ type: "FORCE_SETTLE_DEBT" }];
    }
    if (actions.length === 0) {
      if (
        state.phase === "RAISE_CASH" &&
        state.pendingDebt?.playerId === actorId
      ) {
        return {
          action: { type: "FORCE_SETTLE_DEBT" },
          reasoning: "Settle outstanding debt",
        };
      }
      const timed = timeoutActionForState(state);
      if (timed && timed.actorId === actorId) {
        return {
          action: timed.action,
          reasoning: `Auto ${timed.action.type}`,
        };
      }
      throw new Error(
        `No legal actions for ${actorId} in phase ${state.phase}`,
      );
    }

    const ctx = {
      state,
      actorId,
      legalActions: actions,
      rng,
      rejectedTradeLocks: this.rejectedTradeLocks,
      personality: this.personality,
    };
    const tradeProposals = this.strategy.generateTradeProposals(ctx);
    const allLegal = [...actions];
    for (const proposal of tradeProposals) {
      if (
        !allLegal.some((a) => JSON.stringify(a) === JSON.stringify(proposal))
      ) {
        allLegal.push(proposal);
      }
    }

    const scored = this.strategy.scoreOptions({
      ...ctx,
      legalActions: allLegal,
    });
    let best = pickBestOption(scored, allLegal, state, actorId);

    if (!best && state.phase === "RAISE_CASH") {
      const settle = allLegal.find((a) => a.type === "FORCE_SETTLE_DEBT");
      if (settle) {
        best = { action: settle, score: 1, reasoning: "Settle debt" };
      }
    }

    if (best) {
      return {
        action: best.action,
        reasoning: best.reasoning.slice(0, 120),
      };
    }

    const fallback = actions[0];
    return {
      action: fallback,
      reasoning: `Default ${fallback.type}`,
    };
  }
}

export function createBotPlayer(
  strategy: StrategyProfile,
  personality: BotPersonality = PERSONALITIES.balanced,
): BotPlayer {
  return new BotPlayer(strategy, personality);
}
