import { autoLiquidateAssets } from "./liquidate.js";
import type { GameEvent, GameState, PlayerId } from "./types.js";

export function checkBankruptcy(
  state: GameState,
  playerId: PlayerId,
  creditorId: PlayerId | null,
): GameEvent[] {
  const player = state.players[playerId];
  if (!player || player.cash >= 0) return [];

  // NOTE: Auto-raise cash so timer-driven debt cannot soft-lock the game.
  const events = autoLiquidateAssets(state, playerId, creditorId);
  if (player.cash >= 0) return events;

  player.isBankrupt = true;

  for (const pos of [...player.ownedPositions]) {
    if (creditorId && state.ownership[pos]) {
      const ownershipEntry = state.ownership[pos];
      if (ownershipEntry) {
        ownershipEntry.ownerId = creditorId;
      }
      const creditor = state.players[creditorId];
      if (creditor) {
        creditor.ownedPositions.push(pos);
        // NOTE: Keep ownership.isMortgaged and creditor.mortgaged in sync.
        if (ownershipEntry?.isMortgaged && !creditor.mortgaged.includes(pos)) {
          creditor.mortgaged.push(pos);
        }
      }
    } else {
      delete state.ownership[pos];
    }
  }

  player.ownedPositions = [];
  player.houses = {};
  player.hotels = {};
  player.mortgaged = [];

  events.push({ type: "PLAYER_BANKRUPT", playerId, creditorId });
  return events;
}
