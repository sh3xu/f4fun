import {
  type GameAction,
  ownsColorGroup,
  TILE_BY_POSITION,
} from "@f4fun/monopoly-engine";
import type { StrategyContext } from "../strategy/types.js";
import { postActionCashOk } from "../valuation/cashBuffer.js";

export function scoreBuildOptions(ctx: StrategyContext): {
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
    if (action.type === "BUILD_HOUSE") {
      const tile = TILE_BY_POSITION.get(action.position);
      if (tile?.type !== "property") continue;
      if (!ownsColorGroup(state, actorId, tile.colorGroup)) continue;

      const houses = player.houses[action.position] ?? 0;
      const cost = tile.houseCost;
      const cashAfter = player.cash - cost;

      // NOTE: Prefer 3 houses per property before hotels (house-shortage strategy).
      let score = tile.rentLevels[Math.min(houses + 1, 5)] * 3;
      if (houses === 2) score += 80;
      if (houses >= 3) score -= 40;

      if (!postActionCashOk(ctx, cashAfter)) {
        score -= 500;
      }

      options.push({
        action,
        score,
        reasoning: `Build on ${tile.name} — increases rent yield`,
      });
    }

    if (action.type === "BUILD_HOTEL") {
      const tile = TILE_BY_POSITION.get(action.position);
      if (tile?.type !== "property") continue;
      const houses = player.houses[action.position] ?? 0;
      if (houses < 3) {
        options.push({
          action,
          score: -200,
          reasoning: "Wait for 3 houses before hotel",
        });
        continue;
      }
      const cashAfter = player.cash - tile.houseCost;
      const score = postActionCashOk(ctx, cashAfter)
        ? tile.rentLevels[5] * 2
        : -300;
      options.push({
        action,
        score,
        reasoning: `Hotel on ${tile.name} — max rent`,
      });
    }
  }

  return options;
}

export function scoreEndTurn(ctx: StrategyContext): {
  action: GameAction;
  score: number;
  reasoning: string;
} | null {
  const endTurn = ctx.legalActions.find((a) => a.type === "END_TURN");
  if (!endTurn) return null;
  return {
    action: endTurn,
    score: 1,
    reasoning: "End turn",
  };
}
