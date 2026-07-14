import { TILE_BY_POSITION } from "./config/board.js";
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

export function mortgageProperty(
  state: GameState,
  playerId: PlayerId,
  position: number,
): { error?: string; events: GameEvent[] } {
  const player = state.players[playerId];
  if (!player) return { error: "Player not found", events: [] };

  const value = mortgageValueAt(position);
  if (value === null) return { error: "Not a mortgageable tile", events: [] };

  const ownership = state.ownership[position];
  if (!ownership || ownership.ownerId !== playerId) {
    return { error: "You do not own this property", events: [] };
  }

  if (ownership.isMortgaged) {
    return { error: "Already mortgaged", events: [] };
  }

  if (
    (player.houses[position] ?? 0) > 0 ||
    (player.hotels[position] ?? 0) > 0
  ) {
    return { error: "Sell buildings before mortgaging", events: [] };
  }

  ownership.isMortgaged = true;
  if (!player.mortgaged.includes(position)) {
    player.mortgaged.push(position);
  }
  player.cash += value;

  return {
    events: [
      {
        type: "PROPERTY_MORTGAGED",
        playerId,
        position,
        mortgageValue: value,
      },
    ],
  };
}

export function unmortgageProperty(
  state: GameState,
  playerId: PlayerId,
  position: number,
): { error?: string; events: GameEvent[] } {
  const player = state.players[playerId];
  if (!player) return { error: "Player not found", events: [] };

  const value = mortgageValueAt(position);
  if (value === null) return { error: "Not a mortgageable tile", events: [] };

  const ownership = state.ownership[position];
  if (!ownership || ownership.ownerId !== playerId) {
    return { error: "You do not own this property", events: [] };
  }

  if (!ownership.isMortgaged) {
    return { error: "Property is not mortgaged", events: [] };
  }

  // Official: unmortgage cost = mortgage value + 10% interest.
  const cost = Math.ceil(value * 1.1);
  if (player.cash < cost) {
    return { error: "Insufficient funds", events: [] };
  }

  player.cash -= cost;
  ownership.isMortgaged = false;
  player.mortgaged = player.mortgaged.filter((p) => p !== position);

  return {
    events: [
      {
        type: "PROPERTY_UNMORTGAGED",
        playerId,
        position,
        cost,
      },
    ],
  };
}
