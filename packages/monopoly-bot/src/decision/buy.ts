import {
  type GameAction,
  type GameState,
  type PlayerId,
  TILE_BY_POSITION,
} from "@f4fun/monopoly-engine";
import type { StrategyContext } from "../strategy/types.js";
import { minimumCashBuffer } from "../valuation/cashBuffer.js";
import {
  countOwnedInGroup,
  valuePositionForBuyer,
} from "../valuation/propertyValue.js";

export function scoreBuyOptions(ctx: StrategyContext): {
  action: GameAction;
  score: number;
  reasoning: string;
}[] {
  const { state, actorId, legalActions } = ctx;
  const player = state.players[actorId];
  if (!player) return [];

  const options: { action: GameAction; score: number; reasoning: string }[] =
    [];

  for (const action of legalActions) {
    if (action.type === "BUY_PROPERTY") {
      const position = player.position;
      const tile = TILE_BY_POSITION.get(position);
      const price =
        tile &&
        (tile.type === "property" ||
          tile.type === "railroad" ||
          tile.type === "utility")
          ? tile.price
          : 0;
      const value = valuePositionForBuyer(state, actorId, position);
      const buffer = minimumCashBuffer(ctx);
      const cashAfter = player.cash - price;

      if (cashAfter < buffer) {
        options.push({
          action,
          score: -1000,
          reasoning: "Skip buy — need cash reserve",
        });
        continue;
      }

      const score = value - price;
      const name = tile?.name ?? "property";
      options.push({
        action,
        score,
        reasoning: `Buy ${name} — strong rent/monopoly value`,
      });
    }

    if (action.type === "DECLINE_PROPERTY") {
      options.push({
        action,
        score: 0,
        reasoning: "Pass on this property",
      });
    }

    if (action.type === "START_AUCTION") {
      options.push({
        action,
        score: -5,
        reasoning: "Start auction instead of buying",
      });
    }
  }

  return options;
}

export function wouldCompleteOpponentMonopoly(
  state: GameState,
  opponentId: PlayerId,
  position: number,
): boolean {
  const tile = TILE_BY_POSITION.get(position);
  if (tile?.type !== "property") return false;
  const owned = countOwnedInGroup(state, opponentId, tile.colorGroup);
  const groupSize = 3;
  return owned >= groupSize - 1;
}
