import {
  type GameAction,
  type GameState,
  getLegalActions,
  type PlayerId,
  type RNG,
  timeoutActionForState,
} from "@f4fun/monopoly-engine";
import { pickBestOption } from "../strategy/expertStrategy.js";
import type { StrategyProfile } from "../strategy/types.js";
import {
  partnerTradeConditionKey,
  pendingTradeFingerprint,
  rejectedDealLockKey,
} from "./tradeFingerprint.js";

export interface BotDecision {
  action: GameAction;
  reasoning: string;
}

export class BotPlayer {
  /** Locks: deal fingerprint + partner condition at rejection time. */
  private readonly rejectedTradeLocks = new Set<string>();
  /** NOTE: Clear locks once per PRE_ROLL visit so next turn can reconsider. */
  private clearedLocksThisPreRoll = false;

  constructor(private readonly strategy: StrategyProfile) {}

  /**
   * Record a rejected deal for the partner's current conditions.
   * Same deal may be re-offered next turn or if the partner's cash/deeds change.
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
    // NOTE: New turn — allow the same deal again; scoring uses partner conditions.
    if (state.phase === "PRE_ROLL") {
      if (!this.clearedLocksThisPreRoll) {
        this.rejectedTradeLocks.clear();
        this.clearedLocksThisPreRoll = true;
      }
    } else {
      this.clearedLocksThisPreRoll = false;
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
    let best = pickBestOption(scored, allLegal);

    if (!best && state.phase === "RAISE_CASH") {
      const settle = allLegal.find((a) => a.type === "FORCE_SETTLE_DEBT");
      if (settle) {
        best = { action: settle, score: 1, reasoning: "Settle debt" };
      }
    }

    if (best) {
      if (best.action.type === "REJECT_TRADE") {
        const rejectAction = best.action;
        const trade = state.pendingTrades.find(
          (t) => t.tradeId === rejectAction.tradeId,
        );
        if (trade) {
          this.rememberRejectedTrade(
            pendingTradeFingerprint(trade),
            partnerTradeConditionKey(state, trade.fromPlayerId),
          );
        }
      }

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

export function createBotPlayer(strategy: StrategyProfile): BotPlayer {
  return new BotPlayer(strategy);
}
