import {
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
  type GameEvent,
  type GameState,
  TILE_BY_POSITION,
} from "@f4fun/monopoly-engine";
import { getTileLabel } from "../components/tile-labels";

function playerName(state: GameState, playerId: string): string {
  return state.players[playerId]?.name ?? "Player";
}

function tileName(position: number): string {
  const tile = TILE_BY_POSITION.get(position);
  return tile ? getTileLabel(tile.name) : `tile ${position}`;
}

function cardText(deck: "chance" | "community_chest", cardId: string): string {
  const cards = deck === "chance" ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS;
  return cards.find((c) => c.id === cardId)?.text ?? "a card";
}

/** Formats a game event for the table log. Returns null to skip noisy/system events. */
export function formatGameEvent(
  state: GameState,
  event: GameEvent,
): { playerId: string; playerName: string; message: string } | null {
  switch (event.type) {
    case "DICE_ROLLED":
    case "TURN_ADVANCED":
    case "AUCTION_BID":
    case "AUCTION_PASSED":
    case "AUCTION_AUTOFOLDED":
    case "CARD_APPLIED":
    case "JAIL_TURN_FAILED":
    case "DEBT_RESOLVED":
      return null;

    case "PASSED_GO":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `passed GO and collected $${event.amount}`,
      };

    case "PROPERTY_BOUGHT":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `bought ${tileName(event.position)} for $${event.price}`,
      };

    case "PROPERTY_DECLINED":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `declined ${tileName(event.position)}`,
      };

    case "RENT_PAID":
      return {
        playerId: event.payerId,
        playerName: playerName(state, event.payerId),
        message: `paid $${event.amount} to ${playerName(state, event.ownerId)}`,
      };

    case "TAX_PAID":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `paid $${event.amount} in tax`,
      };

    case "SENT_TO_JAIL":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: "was sent to Jail",
      };

    case "RELEASED_FROM_JAIL": {
      const method =
        event.method === "fine"
          ? "paid the fine"
          : event.method === "card"
            ? "used a Jail Free card"
            : "rolled doubles";
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `left Jail (${method})`,
      };
    }

    case "CARD_DRAWN": {
      const deckLabel = event.deck === "chance" ? "Chance" : "Community Chest";
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `landed on ${deckLabel} — ${cardText(event.deck, event.cardId)}`,
      };
    }

    case "HOUSE_BUILT":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `built a house on ${tileName(event.position)}`,
      };

    case "HOTEL_BUILT":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `built a hotel on ${tileName(event.position)}`,
      };

    case "HOUSE_SOLD":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `sold a house on ${tileName(event.position)}`,
      };

    case "HOTEL_SOLD":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `sold a hotel on ${tileName(event.position)}`,
      };

    case "PROPERTY_MORTGAGED":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `mortgaged ${tileName(event.position)} for $${event.mortgageValue}`,
      };

    case "PROPERTY_UNMORTGAGED":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `unmortgaged ${tileName(event.position)} for $${event.cost}`,
      };

    case "TRADE_PROPOSED":
      return {
        playerId: event.fromPlayerId,
        playerName: playerName(state, event.fromPlayerId),
        message: `proposed a trade to ${playerName(state, event.toPlayerId)}`,
      };

    case "TRADE_REJECTED":
      return {
        playerId: "",
        playerName: "Trade",
        message: "was declined",
      };

    case "TRADE_COMPLETED":
      return {
        playerId: event.initiatorId,
        playerName: playerName(state, event.initiatorId),
        message: `completed a trade with ${playerName(state, event.partnerId)}`,
      };

    case "AUCTION_STARTED":
      return {
        playerId: event.sellerId ?? "",
        playerName: event.sellerId ? playerName(state, event.sellerId) : "Bank",
        message: `started an auction for ${tileName(event.position)}`,
      };

    case "AUCTION_WON":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `won ${tileName(event.position)} at auction for $${event.amount}`,
      };

    case "AUCTION_CANCELLED":
      return {
        playerId: "",
        playerName: "Auction",
        message: `for ${tileName(event.position)} was cancelled`,
      };

    case "PROPERTY_SOLD_TO_BANK":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `sold ${tileName(event.position)} to the bank for $${event.amount}`,
      };

    case "PLAYER_BANKRUPT":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: "went bankrupt",
      };

    case "DEBT_RAISED":
      return {
        playerId: event.playerId,
        playerName: playerName(state, event.playerId),
        message: `must raise $${event.amountNeeded}`,
      };

    case "GAME_WON":
      return {
        playerId: event.winnerId,
        playerName: playerName(state, event.winnerId),
        message: "won the game",
      };

    default:
      return null;
  }
}

export interface GameEventLogBatch {
  sequence: number;
  turn: number;
  action: string;
  events: GameEvent[];
  timestamp: Date | string;
}

/** Builds newest-first activity rows from the persisted event log (rejoin/refresh). */
export function activityEntriesFromEventLog(
  state: GameState,
  eventLog: GameEventLogBatch[],
  cap: number,
): Array<{
  id: string;
  playerId: string;
  playerName: string;
  message: string;
}> {
  const chronological: Array<{
    id: string;
    playerId: string;
    playerName: string;
    message: string;
  }> = [];

  for (const batch of eventLog) {
    let index = 0;
    for (const event of batch.events) {
      const formatted = formatGameEvent(state, event);
      if (!formatted) continue;
      chronological.push({
        id: `log-${batch.sequence}-${event.type}-${index}`,
        playerId: formatted.playerId,
        playerName: formatted.playerName,
        message: formatted.message,
      });
      index += 1;
    }
  }

  return chronological.reverse().slice(0, cap);
}
