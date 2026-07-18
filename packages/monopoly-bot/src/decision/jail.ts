import { evaluateBoardState, type GameAction } from "@f4fun/monopoly-engine";
import type { StrategyContext } from "../strategy/types.js";
import { opponentBuildingPressure } from "../valuation/cashBuffer.js";

export function scoreJailOptions(ctx: StrategyContext): {
  action: GameAction;
  score: number;
  reasoning: string;
}[] {
  const { state, actorId, legalActions } = ctx;
  const player = state.players[actorId];
  if (!player) return [];

  const monopolies = evaluateBoardState(state, actorId).monopolyCount;
  const earlyGame = Object.keys(state.ownership).length < 12;
  const pressure = opponentBuildingPressure(state, actorId);
  const options: { action: GameAction; score: number; reasoning: string }[] =
    [];

  for (const action of legalActions) {
    if (action.type === "PAY_JAIL_FINE") {
      // NOTE: Early game tempo matters more than $50.
      const score = earlyGame
        ? 120
        : monopolies > 0 && pressure > 200
          ? -40
          : 80;
      options.push({
        action,
        score,
        reasoning: earlyGame
          ? "Pay jail fine — tempo matters early"
          : "Pay to leave jail",
      });
    }

    if (action.type === "USE_GOOJF_CARD") {
      const score = pressure > 150 ? 100 : 60;
      options.push({
        action,
        score,
        reasoning: "Use Get Out of Jail Free card",
      });
    }

    if (action.type === "ROLL_FOR_JAIL") {
      // NOTE: Late game with monopolies — stay in jail to collect rent safely.
      const score = !earlyGame && monopolies > 0 && pressure > 250 ? 90 : 30;
      options.push({
        action,
        score,
        reasoning:
          pressure > 250
            ? "Stay in jail — avoid opponent hotels"
            : "Roll for doubles",
      });
    }
  }

  return options;
}
