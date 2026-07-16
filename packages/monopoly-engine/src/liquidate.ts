import { sellPropertyToBank } from "./bankSale.js";
import { sellHotel, sellHouse } from "./building.js";
import { TILE_BY_POSITION } from "./config/board.js";
import { mortgageProperty } from "./mortgage.js";
import type { GameEvent, GameState, PlayerId } from "./types.js";

function mortgageValueAt(position: number): number | null {
  const tile = TILE_BY_POSITION.get(position);
  if (
    !tile ||
    (tile.type !== "property" &&
      tile.type !== "railroad" &&
      tile.type !== "utility")
  ) {
    return null;
  }
  return tile.mortgageValue;
}

function trySellOneBuilding(
  state: GameState,
  playerId: PlayerId,
): GameEvent[] | null {
  const player = state.players[playerId];
  if (!player) return null;

  for (const position of [...player.ownedPositions]) {
    if ((player.hotels[position] ?? 0) > 0) {
      const result = sellHotel(state, playerId, position);
      if (!result.error) return result.events;
    }
  }

  for (const position of [...player.ownedPositions]) {
    if ((player.houses[position] ?? 0) > 0) {
      const result = sellHouse(state, playerId, position);
      if (!result.error) return result.events;
    }
  }

  return null;
}

function unmortgagedPositions(state: GameState, playerId: PlayerId): number[] {
  const player = state.players[playerId];
  if (!player) return [];

  return player.ownedPositions
    .filter((pos) => {
      const ownership = state.ownership[pos];
      return ownership && !ownership.isMortgaged;
    })
    .sort((a, b) => (mortgageValueAt(b) ?? 0) - (mortgageValueAt(a) ?? 0));
}

function tryMortgageOneProperty(
  state: GameState,
  playerId: PlayerId,
): GameEvent[] | null {
  for (const position of unmortgagedPositions(state, playerId)) {
    const result = mortgageProperty(state, playerId, position);
    if (!result.error) return result.events;
  }
  return null;
}

function trySellOnePropertyToBank(
  state: GameState,
  playerId: PlayerId,
): GameEvent[] | null {
  const player = state.players[playerId];
  if (!player) return null;

  const sorted = [...player.ownedPositions].sort(
    (a, b) => (mortgageValueAt(b) ?? 0) - (mortgageValueAt(a) ?? 0),
  );

  for (const position of sorted) {
    const result = sellPropertyToBank(state, playerId, position);
    if (!result.error) return result.events;
  }

  return null;
}

/**
 * Forced raise-cash order when debt makes cash negative:
 * 1) sell houses/hotels, 2) mortgage properties one by one,
 * 3) sell deeds to bank at 90% (price or mortgage value). Stops when cash >= 0.
 */
export function autoLiquidateAssets(
  state: GameState,
  playerId: PlayerId,
): GameEvent[] {
  const player = state.players[playerId];
  if (!player || player.cash >= 0) return [];

  const events: GameEvent[] = [];

  while (player.cash < 0) {
    const sold = trySellOneBuilding(state, playerId);
    if (!sold) break;
    events.push(...sold);
  }

  while (player.cash < 0) {
    const mortgaged = tryMortgageOneProperty(state, playerId);
    if (!mortgaged) break;
    events.push(...mortgaged);
  }

  while (player.cash < 0 && player.ownedPositions.length > 0) {
    const sold = trySellOnePropertyToBank(state, playerId);
    if (!sold) break;
    events.push(...sold);
  }

  return events;
}
