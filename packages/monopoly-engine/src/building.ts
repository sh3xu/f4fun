import {
  HOUSE_SELL_RATE,
  POSITIONS_BY_COLOR,
  TILE_BY_POSITION,
} from "./config/board.js";
import { ownsColorGroup } from "./rent.js";
import type { GameEvent, GameState, PlayerId } from "./types.js";

function houseCostAt(position: number): number | null {
  const tile = TILE_BY_POSITION.get(position);
  if (!tile || tile.type !== "property") return null;
  return tile.houseCost;
}

function sellPayout(houseCost: number): number {
  return Math.floor(houseCost * HOUSE_SELL_RATE);
}

function buildingCount(
  state: GameState,
  playerId: PlayerId,
  position: number,
): number {
  const player = state.players[playerId];
  if (!player) return 0;
  if ((player.hotels[position] ?? 0) > 0) return 5;
  return player.houses[position] ?? 0;
}

function canBuildEvenly(
  state: GameState,
  playerId: PlayerId,
  position: number,
): boolean {
  const tile = TILE_BY_POSITION.get(position);
  if (!tile || tile.type !== "property") return false;

  const positions = POSITIONS_BY_COLOR.get(tile.colorGroup);
  if (!positions) return false;

  const counts = positions.map((pos) => buildingCount(state, playerId, pos));
  const min = Math.min(...counts);
  const current = buildingCount(state, playerId, position);
  return current === min;
}

export function canSellEvenly(
  state: GameState,
  playerId: PlayerId,
  position: number,
): boolean {
  const tile = TILE_BY_POSITION.get(position);
  if (!tile || tile.type !== "property") return false;

  const positions = POSITIONS_BY_COLOR.get(tile.colorGroup);
  if (!positions) return false;

  const counts = positions.map((pos) => buildingCount(state, playerId, pos));
  const max = Math.max(...counts);
  const current = buildingCount(state, playerId, position);
  return current === max;
}

/** Issue #52 — clear monopoly buildings before mortgage / sell / trade. */
export const COLOR_GROUP_BUILDINGS_CLEAR_ERROR =
  "Sell all houses/hotels evenly from this color group first.";

export function tileHasOwnerBuildings(
  state: GameState,
  playerId: PlayerId,
  position: number,
): boolean {
  return buildingCount(state, playerId, position) > 0;
}

/** True when the player owns the full color set and any tile in it has buildings. */
export function monopolyColorGroupHasBuildings(
  state: GameState,
  playerId: PlayerId,
  position: number,
): boolean {
  const tile = TILE_BY_POSITION.get(position);
  if (!tile || tile.type !== "property") return false;
  if (!ownsColorGroup(state, playerId, tile.colorGroup)) return false;

  const positions = POSITIONS_BY_COLOR.get(tile.colorGroup);
  if (!positions) return false;

  return positions.some((pos) => tileHasOwnerBuildings(state, playerId, pos));
}

/**
 * Blocks mortgage / deed transfer while buildings remain on the deed,
 * or anywhere on an owned monopoly color group (official even-demolish rules).
 */
export function buildingsBlockDeedAction(
  state: GameState,
  playerId: PlayerId,
  position: number,
): string | null {
  if (tileHasOwnerBuildings(state, playerId, position)) {
    return COLOR_GROUP_BUILDINGS_CLEAR_ERROR;
  }
  if (monopolyColorGroupHasBuildings(state, playerId, position)) {
    return COLOR_GROUP_BUILDINGS_CLEAR_ERROR;
  }
  return null;
}

export function buildHouse(
  state: GameState,
  playerId: PlayerId,
  position: number,
): { error?: string; events: GameEvent[] } {
  const player = state.players[playerId];
  if (!player) return { error: "Player not found", events: [] };

  const tile = TILE_BY_POSITION.get(position);
  if (!tile || tile.type !== "property") {
    return { error: "Not a buildable property", events: [] };
  }

  const ownership = state.ownership[position];
  if (!ownership || ownership.ownerId !== playerId) {
    return { error: "You do not own this property", events: [] };
  }

  if (ownership.isMortgaged) {
    return { error: "Cannot build on mortgaged property", events: [] };
  }

  if (!ownsColorGroup(state, playerId, tile.colorGroup)) {
    return { error: "Need monopoly to build", events: [] };
  }

  if ((player.hotels[position] ?? 0) > 0) {
    return { error: "Hotel already built", events: [] };
  }

  const houses = player.houses[position] ?? 0;
  if (houses >= 4) {
    return { error: "Already has 4 houses; build a hotel", events: [] };
  }

  if (!canBuildEvenly(state, playerId, position)) {
    return { error: "Must build evenly across the color group", events: [] };
  }

  if (state.bankHouses <= 0) {
    return { error: "Bank has no houses left", events: [] };
  }

  if (player.cash < tile.houseCost) {
    return { error: "Insufficient funds", events: [] };
  }

  player.cash -= tile.houseCost;
  player.houses[position] = houses + 1;
  state.bankHouses -= 1;

  return {
    events: [{ type: "HOUSE_BUILT", playerId, position }],
  };
}

export function sellHouse(
  state: GameState,
  playerId: PlayerId,
  position: number,
): { error?: string; events: GameEvent[] } {
  const player = state.players[playerId];
  if (!player) return { error: "Player not found", events: [] };

  const cost = houseCostAt(position);
  if (cost === null) return { error: "Not a property", events: [] };

  const ownership = state.ownership[position];
  if (!ownership || ownership.ownerId !== playerId) {
    return { error: "You do not own this property", events: [] };
  }

  if ((player.hotels[position] ?? 0) > 0) {
    return { error: "Sell hotel first", events: [] };
  }

  const houses = player.houses[position] ?? 0;
  if (houses <= 0) {
    return { error: "No houses to sell", events: [] };
  }

  if (!canSellEvenly(state, playerId, position)) {
    return { error: "Must sell evenly across the color group", events: [] };
  }

  player.houses[position] = houses - 1;
  if (player.houses[position] === 0) {
    delete player.houses[position];
  }
  player.cash += sellPayout(cost);
  state.bankHouses += 1;

  return {
    events: [{ type: "HOUSE_SOLD", playerId, position }],
  };
}

export function buildHotel(
  state: GameState,
  playerId: PlayerId,
  position: number,
): { error?: string; events: GameEvent[] } {
  const player = state.players[playerId];
  if (!player) return { error: "Player not found", events: [] };

  const tile = TILE_BY_POSITION.get(position);
  if (!tile || tile.type !== "property") {
    return { error: "Not a buildable property", events: [] };
  }

  const ownership = state.ownership[position];
  if (!ownership || ownership.ownerId !== playerId) {
    return { error: "You do not own this property", events: [] };
  }

  if (ownership.isMortgaged) {
    return { error: "Cannot build on mortgaged property", events: [] };
  }

  if (!ownsColorGroup(state, playerId, tile.colorGroup)) {
    return { error: "Need monopoly to build", events: [] };
  }

  if ((player.hotels[position] ?? 0) > 0) {
    return { error: "Hotel already built", events: [] };
  }

  if ((player.houses[position] ?? 0) !== 4) {
    return { error: "Need 4 houses before hotel", events: [] };
  }

  if (!canBuildEvenly(state, playerId, position)) {
    return { error: "Must build evenly across the color group", events: [] };
  }

  if (state.bankHotels <= 0) {
    return { error: "Bank has no hotels left", events: [] };
  }

  if (player.cash < tile.houseCost) {
    return { error: "Insufficient funds", events: [] };
  }

  player.cash -= tile.houseCost;
  delete player.houses[position];
  player.hotels[position] = 1;
  state.bankHouses += 4;
  state.bankHotels -= 1;

  return {
    events: [{ type: "HOTEL_BUILT", playerId, position }],
  };
}

export function sellHotel(
  state: GameState,
  playerId: PlayerId,
  position: number,
): { error?: string; events: GameEvent[] } {
  const player = state.players[playerId];
  if (!player) return { error: "Player not found", events: [] };

  const cost = houseCostAt(position);
  if (cost === null) return { error: "Not a property", events: [] };

  const ownership = state.ownership[position];
  if (!ownership || ownership.ownerId !== playerId) {
    return { error: "You do not own this property", events: [] };
  }

  if ((player.hotels[position] ?? 0) <= 0) {
    return { error: "No hotel to sell", events: [] };
  }

  if (!canSellEvenly(state, playerId, position)) {
    return { error: "Must sell evenly across the color group", events: [] };
  }

  // NOTE: House rule — hotel sells as 5 house-equivalents at HOUSE_SELL_RATE.
  delete player.hotels[position];
  player.cash += sellPayout(cost * 5);
  state.bankHotels += 1;

  return {
    events: [{ type: "HOTEL_SOLD", playerId, position }],
  };
}
