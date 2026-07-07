import type { GameEvent, GameState, PlayerId } from "./types.js";

export function checkBankruptcy(
  state: GameState,
  playerId: PlayerId,
  creditorId: PlayerId | null,
): GameEvent[] {
  const player = state.players[playerId];
  if (!player || player.cash >= 0) return [];

  player.isBankrupt = true;

  for (const pos of player.ownedPositions) {
    if (creditorId && state.ownership[pos]) {
      const ownershipEntry = state.ownership[pos];
      if (ownershipEntry) {
        ownershipEntry.ownerId = creditorId;
      }
      const creditor = state.players[creditorId];
      if (creditor) {
        creditor.ownedPositions.push(pos);
      }
    } else {
      delete state.ownership[pos];
    }
  }

  player.ownedPositions = [];
  player.houses = {};
  player.hotels = {};
  player.mortgaged = [];

  return [{ type: "PLAYER_BANKRUPT", playerId, creditorId }];
}
