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

export interface BotDecision {
  action: GameAction;
  reasoning: string;
}

export class BotPlayer {
  constructor(private readonly strategy: StrategyProfile) {}

  decide(
    state: GameState,
    actorId: PlayerId,
    legalActions?: GameAction[],
    rng: RNG = Math.random,
  ): BotDecision {
    let actions = legalActions ?? getLegalActions(state, actorId);
    if (
      actions.length === 0 &&
      state.phase === "RAISE_CASH" &&
      state.pendingDebt
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

    const ctx = { state, actorId, legalActions: actions, rng };
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
