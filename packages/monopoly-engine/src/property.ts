import { TILE_BY_POSITION } from "./config/board.js";
import type { GameEvent, GameState, PlayerId } from "./types.js";

export function canBuyProperty(
  state: GameState,
  playerId: PlayerId,
  position: number,
): { canBuy: boolean; reason?: string } {
  const player = state.players[playerId];
  if (!player) return { canBuy: false, reason: "Player not found" };

  const tile = TILE_BY_POSITION.get(position);
  if (!tile) return { canBuy: false, reason: "Invalid position" };

  if (
    tile.type !== "property" &&
    tile.type !== "railroad" &&
    tile.type !== "utility"
  ) {
    return { canBuy: false, reason: "Tile is not buyable" };
  }

  if (state.ownership[position]) {
    return { canBuy: false, reason: "Already owned" };
  }

  if (player.cash < tile.price) {
    return { canBuy: false, reason: "Insufficient funds" };
  }

  return { canBuy: true };
}

export function buyProperty(
  state: GameState,
  playerId: PlayerId,
  position: number,
): GameEvent[] {
  const tile = TILE_BY_POSITION.get(position);
  if (
    !tile ||
    (tile.type !== "property" &&
      tile.type !== "railroad" &&
      tile.type !== "utility")
  ) {
    return [];
  }

  const player = state.players[playerId];
  if (!player) return [];

  player.cash -= tile.price;
  player.ownedPositions.push(position);

  state.ownership[position] = {
    ownerId: playerId,
    isMortgaged: false,
  };

  return [
    {
      type: "PROPERTY_BOUGHT",
      playerId,
      position,
      price: tile.price,
    },
  ];
}
