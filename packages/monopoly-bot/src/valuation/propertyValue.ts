import {
  evaluateBoardState,
  type GameState,
  ownsColorGroup,
  type PlayerId,
  POSITIONS_BY_COLOR,
  TILE_BY_POSITION,
} from "@f4fun/monopoly-engine";
import {
  LANDING_FREQUENCY_WEIGHT,
  monopolyCompletionPremium,
} from "./monopolyPremium.js";

export function countOwnedInGroup(
  state: GameState,
  playerId: PlayerId,
  colorGroup: string,
): number {
  const positions = POSITIONS_BY_COLOR.get(colorGroup as never) ?? [];
  return positions.filter((pos) => state.ownership[pos]?.ownerId === playerId)
    .length;
}

export function valuePropertyAt(
  state: GameState,
  playerId: PlayerId,
  position: number,
): number {
  const tile = TILE_BY_POSITION.get(position);
  if (!tile) return 0;

  let base = 0;
  let colorGroup: string | null = null;

  if (tile.type === "property") {
    base = tile.price;
    colorGroup = tile.colorGroup;
    const rentPerDollar = tile.rentLevels[3] / Math.max(tile.price, 1);
    base *= 0.5 + rentPerDollar * 2;
  } else if (tile.type === "railroad") {
    base = tile.price * 1.15;
  } else if (tile.type === "utility") {
    base = tile.price * 1.1;
  } else {
    return 0;
  }

  if (colorGroup) {
    const groupSize = POSITIONS_BY_COLOR.get(colorGroup as never)?.length ?? 3;
    const owned = countOwnedInGroup(state, playerId, colorGroup);
    base *= LANDING_FREQUENCY_WEIGHT[colorGroup as never];
    base *= monopolyCompletionPremium(owned, groupSize);
    if (ownsColorGroup(state, playerId, colorGroup as never)) {
      base *= 1.25;
    }
  }

  return base;
}

export function valuePositionForBuyer(
  state: GameState,
  buyerId: PlayerId,
  position: number,
): number {
  const tile = TILE_BY_POSITION.get(position);
  if (!tile) return 0;

  const ownership = state.ownership[position];
  if (ownership) return valuePropertyAt(state, ownership.ownerId, position);

  let value = valuePropertyAt(state, buyerId, position);
  if (tile.type === "property") {
    const owned = countOwnedInGroup(state, buyerId, tile.colorGroup);
    const groupSize = POSITIONS_BY_COLOR.get(tile.colorGroup)?.length ?? 3;
    if (owned > 0) {
      value *= monopolyCompletionPremium(owned + 1, groupSize);
    }
  }
  return value;
}

export function playerNetScore(state: GameState, playerId: PlayerId): number {
  return evaluateBoardState(state, playerId).score;
}
