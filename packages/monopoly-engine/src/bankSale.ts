import { TILE_BY_POSITION } from "./config/board.js";
import type { GameEvent, GameState, PlayerId } from "./types.js";

const BANK_SALE_RATE = 0.9;

function tilePriceAt(position: number): number | null {
  const tile = TILE_BY_POSITION.get(position);
  if (
    !tile ||
    (tile.type !== "property" &&
      tile.type !== "railroad" &&
      tile.type !== "utility")
  ) {
    return null;
  }
  return tile.price;
}

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

export function bankSaleAmount(
  position: number,
  isMortgaged: boolean,
): number | null {
  if (isMortgaged) {
    const mortgageValue = mortgageValueAt(position);
    if (mortgageValue === null) return null;
    return Math.floor(mortgageValue * BANK_SALE_RATE);
  }

  const tilePrice = tilePriceAt(position);
  if (tilePrice === null) return null;
  return Math.floor(tilePrice * BANK_SALE_RATE);
}

export function sellPropertyToBank(
  state: GameState,
  playerId: PlayerId,
  position: number,
): { error?: string; events: GameEvent[] } {
  const player = state.players[playerId];
  if (!player) return { error: "Player not found", events: [] };

  const ownership = state.ownership[position];
  if (!ownership || ownership.ownerId !== playerId) {
    return { error: "You do not own this property", events: [] };
  }

  if (
    (player.houses[position] ?? 0) > 0 ||
    (player.hotels[position] ?? 0) > 0
  ) {
    return { error: "Sell buildings before selling to bank", events: [] };
  }

  const amount = bankSaleAmount(position, ownership.isMortgaged);
  if (amount === null) {
    return { error: "Not a sellable property", events: [] };
  }

  player.cash += amount;
  player.ownedPositions = player.ownedPositions.filter((p) => p !== position);
  player.mortgaged = player.mortgaged.filter((p) => p !== position);
  delete player.houses[position];
  delete player.hotels[position];
  delete state.ownership[position];

  return {
    events: [
      {
        type: "PROPERTY_SOLD_TO_BANK",
        playerId,
        position,
        amount,
      },
    ],
  };
}
