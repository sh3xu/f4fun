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

function mortgageRedemptionCost(position: number): number {
  const tile = TILE_BY_POSITION.get(position);
  if (
    !tile ||
    (tile.type !== "property" &&
      tile.type !== "railroad" &&
      tile.type !== "utility")
  ) {
    return 0;
  }
  return Math.ceil(tile.mortgageValue * 1.1);
}

export function valuePropertyAt(
  state: GameState,
  playerId: PlayerId,
  position: number,
): number {
  const tile = TILE_BY_POSITION.get(position);
  const ownership = state.ownership[position];
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

  if (ownership?.isMortgaged) {
    base = Math.max(
      tile.mortgageValue,
      base - mortgageRedemptionCost(position),
    );
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
  // NOTE: valuePropertyAt already applies mortgage discount for railroads/utilities.
  if (tile.type !== "property") {
    return valuePropertyAt(state, buyerId, position);
  }

  const groupSize = POSITIONS_BY_COLOR.get(tile.colorGroup)?.length ?? 3;
  const prospectiveOwned =
    countOwnedInGroup(state, buyerId, tile.colorGroup) +
    (ownership?.ownerId === buyerId ? 0 : 1);

  let value = tile.price;
  const rentPerDollar = tile.rentLevels[3] / Math.max(tile.price, 1);
  value *= 0.5 + rentPerDollar * 2;
  value *= LANDING_FREQUENCY_WEIGHT[tile.colorGroup];
  value *= monopolyCompletionPremium(prospectiveOwned, groupSize);
  if (prospectiveOwned >= groupSize) {
    value *= 1.25;
  }

  if (ownership?.isMortgaged) {
    value = Math.max(
      tile.mortgageValue,
      value - mortgageRedemptionCost(position),
    );
  }

  return value;
}

export function playerNetScore(state: GameState, playerId: PlayerId): number {
  return evaluateBoardState(state, playerId).score;
}
