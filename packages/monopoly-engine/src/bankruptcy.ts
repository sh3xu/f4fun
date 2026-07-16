import { autoLiquidateAssets } from "./liquidate.js";
import type { GameEvent, GameState, PlayerId, PlayerState } from "./types.js";

function transferPropertyToCreditor(
  state: GameState,
  debtor: PlayerState,
  creditor: PlayerState,
  position: number,
): void {
  const ownershipEntry = state.ownership[position];
  if (!ownershipEntry) return;

  ownershipEntry.ownerId = creditor.id;
  creditor.ownedPositions.push(position);

  const houses = debtor.houses[position] ?? 0;
  if (houses > 0) {
    creditor.houses[position] = (creditor.houses[position] ?? 0) + houses;
    delete debtor.houses[position];
  }

  const hotels = debtor.hotels[position] ?? 0;
  if (hotels > 0) {
    creditor.hotels[position] = (creditor.hotels[position] ?? 0) + hotels;
    delete debtor.hotels[position];
  }

  if (ownershipEntry.isMortgaged && !creditor.mortgaged.includes(position)) {
    creditor.mortgaged.push(position);
  }
}

export function checkBankruptcy(
  state: GameState,
  playerId: PlayerId,
  creditorId: PlayerId | null,
): GameEvent[] {
  const player = state.players[playerId];
  if (!player || player.cash >= 0) return [];

  const events: GameEvent[] = [];

  while (player.cash < 0) {
    const before = player.cash;
    const raised = autoLiquidateAssets(state, playerId);
    if (raised.length === 0 || player.cash === before) break;
    events.push(...raised);
  }

  if (player.cash >= 0) return events;

  player.isBankrupt = true;

  for (const pos of [...player.ownedPositions]) {
    if (creditorId && state.ownership[pos]) {
      const creditor = state.players[creditorId];
      if (creditor) {
        transferPropertyToCreditor(state, player, creditor, pos);
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
