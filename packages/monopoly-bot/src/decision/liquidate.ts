import {
  type GameAction,
  ownsColorGroup,
  POSITIONS_BY_COLOR,
  TILE_BY_POSITION,
} from "@f4fun/monopoly-engine";
import type { StrategyContext } from "../strategy/types.js";

function isMonopolyProperty(
  state: Parameters<typeof ownsColorGroup>[0],
  actorId: string,
  position: number,
): boolean {
  const tile = TILE_BY_POSITION.get(position);
  if (tile?.type !== "property") return false;
  return ownsColorGroup(state, actorId, tile.colorGroup);
}

function liquidationPriority(
  state: Parameters<typeof ownsColorGroup>[0],
  actorId: string,
  position: number,
): number {
  const tile = TILE_BY_POSITION.get(position);
  if (!tile) return 0;

  if (
    tile.type === "property" &&
    isMonopolyProperty(state, actorId, position)
  ) {
    return -1000;
  }

  if (tile.type === "property") {
    const group = tile.colorGroup;
    const owned = POSITIONS_BY_COLOR.get(group)?.filter(
      (p) => state.ownership[p]?.ownerId === actorId,
    ).length;
    if (owned === 1) return 50;
    return 30;
  }

  return 40;
}

export function scoreLiquidationOptions(ctx: StrategyContext): {
  action: GameAction;
  score: number;
  reasoning: string;
}[] {
  const { state, actorId, legalActions } = ctx;
  // NOTE: Only liquidate during debt — high sell scores must not beat END_TURN/BUILD.
  if (state.phase !== "RAISE_CASH") {
    return [];
  }

  const options: { action: GameAction; score: number; reasoning: string }[] =
    [];

  for (const action of legalActions) {
    if (action.type === "SELL_HOUSE" || action.type === "SELL_HOTEL") {
      // NOTE: Issue #52 — demolish evenly before mortgage / deed sale (official order).
      options.push({
        action,
        score: 400,
        reasoning: `Raise cash via ${action.type.replace(/_/g, " ").toLowerCase()}`,
      });
      continue;
    }

    if (
      action.type === "MORTGAGE_PROPERTY" ||
      action.type === "SELL_PROPERTY_TO_BANK"
    ) {
      const position = action.position;
      const priority = liquidationPriority(state, actorId, position);
      const bankSalePenalty = action.type === "SELL_PROPERTY_TO_BANK" ? -60 : 0;
      options.push({
        action,
        score: priority + bankSalePenalty,
        reasoning: `Raise cash via ${action.type.replace(/_/g, " ").toLowerCase()}`,
      });
    }

    if (action.type === "FORCE_SETTLE_DEBT") {
      options.push({
        action,
        score: -2000,
        reasoning: "Force settle debt after liquidating",
      });
    }
  }

  return options;
}
