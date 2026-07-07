import {
  type ColorGroup,
  POSITIONS_BY_COLOR,
  type PropertyTile,
  RAILROAD_POSITIONS,
  RAILROAD_RENT,
  TILE_BY_POSITION,
  UTILITY_MULTIPLIER,
  UTILITY_POSITIONS,
} from "./config/board.js";
import type { GameEvent, GameState, PlayerId } from "./types.js";

export function calculateRent(
  state: GameState,
  position: number,
  diceSum?: number,
): number {
  const ownership = state.ownership[position];
  if (!ownership || ownership.isMortgaged) return 0;

  const tile = TILE_BY_POSITION.get(position);
  if (!tile) return 0;

  if (tile.type === "property") {
    return calculatePropertyRent(state, tile, ownership.ownerId);
  }

  if (tile.type === "railroad") {
    return calculateRailroadRent(state, ownership.ownerId);
  }

  if (tile.type === "utility") {
    if (diceSum === undefined) return 0;
    return calculateUtilityRent(state, ownership.ownerId, diceSum);
  }

  return 0;
}

function calculatePropertyRent(
  state: GameState,
  tile: PropertyTile,
  ownerId: PlayerId,
): number {
  const player = state.players[ownerId];
  if (!player) return 0;

  const houses = player.houses?.[tile.position] || 0;
  const hotels = player.hotels?.[tile.position] || 0;

  if (hotels > 0) {
    return tile.rentLevels?.[5] ?? tile.rent;
  }

  if (houses > 0) {
    return tile.rentLevels?.[houses] ?? tile.rent;
  }

  const hasMonopoly = ownsColorGroup(state, ownerId, tile.colorGroup);
  return hasMonopoly ? tile.rent * 2 : tile.rent;
}

function calculateRailroadRent(state: GameState, ownerId: PlayerId): number {
  const player = state.players[ownerId];
  if (!player) return 0;

  const count = player.ownedPositions.filter((pos) =>
    RAILROAD_POSITIONS.includes(pos),
  ).length;

  return RAILROAD_RENT[count] || 0;
}

function calculateUtilityRent(
  state: GameState,
  ownerId: PlayerId,
  diceSum: number,
): number {
  const player = state.players[ownerId];
  if (!player) return 0;

  const count = player.ownedPositions.filter((pos) =>
    UTILITY_POSITIONS.includes(pos),
  ).length;

  const multiplier = UTILITY_MULTIPLIER[count] || 0;
  return diceSum * multiplier;
}

export function ownsColorGroup(
  state: GameState,
  playerId: PlayerId,
  colorGroup: ColorGroup,
): boolean {
  const player = state.players[playerId];
  if (!player) return false;

  const positions = POSITIONS_BY_COLOR.get(colorGroup);
  if (!positions) return false;

  return positions.every((pos) => player.ownedPositions.includes(pos));
}

export function chargeRent(
  state: GameState,
  payerId: PlayerId,
  ownerId: PlayerId,
  position: number,
  diceSum?: number,
): GameEvent[] {
  const amount = calculateRent(state, position, diceSum);
  if (amount === 0) return [];

  const payer = state.players[payerId];
  const owner = state.players[ownerId];

  if (!payer || !owner) return [];

  payer.cash -= amount;
  owner.cash += amount;

  return [
    {
      type: "RENT_PAID",
      payerId,
      ownerId,
      position,
      amount,
    },
  ];
}
