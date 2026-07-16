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

function sellPropertyToBank(
  state: GameState,
  playerId: PlayerId,
  position: number,
): GameEvent[] {
  const player = state.players[playerId];
  if (!player) return [];

  const ownership = state.ownership[position];
  const mortgageValue = mortgageValueAt(position);
  if (!ownership || ownership.ownerId !== playerId || mortgageValue === null) {
    return [];
  }

  // NOTE: Mortgaged deed → bank pays half mortgage; unmortgaged → full mortgage (~half price).
  const amount = ownership.isMortgaged
    ? Math.floor(mortgageValue / 2)
    : mortgageValue;

  player.cash += amount;
  player.ownedPositions = player.ownedPositions.filter((p) => p !== position);
  player.mortgaged = player.mortgaged.filter((p) => p !== position);
  delete player.houses[position];
  delete player.hotels[position];
  delete state.ownership[position];

  return [
    {
      type: "PROPERTY_SOLD_TO_BANK",
      playerId,
      position,
      amount,
    },
  ];
}

/**
 * Forced raise-cash order when debt makes cash negative:
 * 1) sell houses/hotels, 2) mortgage properties one by one.
 * 3) Only when bankrupt to the bank (no player creditor): sell deeds to bank
 *    (mortgaged deeds pay half mortgage value). Stops when cash >= 0.
 */
export function autoLiquidateAssets(
  state: GameState,
  playerId: PlayerId,
  creditorId: PlayerId | null = null,
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
    const next = unmortgagedPositions(state, playerId)[0];
    if (next === undefined) break;
    const result = mortgageProperty(state, playerId, next);
    if (result.error) break;
    events.push(...result.events);
  }

  // NOTE: Player creditors receive remaining deeds on bankrupt — do not sell to bank.
  if (creditorId !== null) return events;

  while (player.cash < 0 && player.ownedPositions.length > 0) {
    const sorted = [...player.ownedPositions].sort(
      (a, b) => (mortgageValueAt(b) ?? 0) - (mortgageValueAt(a) ?? 0),
    );
    const position = sorted[0];
    if (position === undefined) break;
    events.push(...sellPropertyToBank(state, playerId, position));
  }

  return events;
}
