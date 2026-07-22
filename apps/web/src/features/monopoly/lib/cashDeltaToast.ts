import type { GameEvent } from "@f4fun/monopoly-engine";
import {
  buildingSellPayout,
  hotelUpgradeCost,
  JAIL_FINE,
  TILE_BY_POSITION,
} from "@f4fun/monopoly-engine";

/**
 * Net cash change for a player implied by a batch of game events.
 * Returns null when the batch has no cash signal for that player.
 */
export function cashDeltaFromEvents(
  events: GameEvent[],
  playerId: string,
): number | null {
  let delta = 0;
  let touched = false;

  for (const event of events) {
    switch (event.type) {
      case "PASSED_GO":
        if (event.playerId === playerId) {
          delta += event.amount;
          touched = true;
        }
        break;
      case "PROPERTY_BOUGHT":
        if (event.playerId === playerId) {
          delta -= event.price;
          touched = true;
        }
        break;
      case "AUCTION_WON":
        if (event.playerId === playerId) {
          delta -= event.amount;
          touched = true;
        }
        break;
      case "RENT_PAID":
        if (event.payerId === playerId) {
          delta -= event.amount;
          touched = true;
        }
        if (event.ownerId === playerId) {
          delta += event.amount;
          touched = true;
        }
        break;
      case "TAX_PAID":
        if (event.playerId === playerId) {
          delta -= event.amount;
          touched = true;
        }
        break;
      case "PROPERTY_MORTGAGED":
        if (event.playerId === playerId) {
          delta += event.mortgageValue;
          touched = true;
        }
        break;
      case "PROPERTY_UNMORTGAGED":
        if (event.playerId === playerId) {
          delta -= event.cost;
          touched = true;
        }
        break;
      case "PROPERTY_SOLD_TO_BANK":
        if (event.playerId === playerId) {
          delta += event.amount;
          touched = true;
        }
        break;
      case "RELEASED_FROM_JAIL":
        if (event.playerId === playerId && event.method === "fine") {
          delta -= JAIL_FINE;
          touched = true;
        }
        break;
      case "HOUSE_BUILT":
        if (event.playerId === playerId) {
          const tile = TILE_BY_POSITION.get(event.position);
          if (tile?.type === "property") {
            delta -= tile.houseCost;
            touched = true;
          }
        }
        break;
      case "HOTEL_BUILT":
        if (event.playerId === playerId) {
          const tile = TILE_BY_POSITION.get(event.position);
          if (tile?.type === "property") {
            delta -= hotelUpgradeCost(tile.houseCost);
            touched = true;
          }
        }
        break;
      case "HOUSE_SOLD":
        if (event.playerId === playerId) {
          const tile = TILE_BY_POSITION.get(event.position);
          if (tile?.type === "property") {
            delta += buildingSellPayout(tile.houseCost);
            touched = true;
          }
        }
        break;
      case "HOTEL_SOLD":
        if (event.playerId === playerId) {
          const tile = TILE_BY_POSITION.get(event.position);
          if (tile?.type === "property") {
            delta += buildingSellPayout(hotelUpgradeCost(tile.houseCost));
            touched = true;
          }
        }
        break;
      default:
        break;
    }
  }

  return touched ? delta : null;
}

export function formatCashDeltaToast(delta: number): string {
  const sign = delta > 0 ? "+" : "-";
  return `💵 ${sign}$${Math.abs(delta)}`;
}
