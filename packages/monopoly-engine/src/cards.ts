import { checkBankruptcy } from "./bankruptcy.js";
import {
  BOARD_SIZE,
  type Card,
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
  JAIL_POSITION,
  RAILROAD_POSITIONS,
  UTILITY_POSITIONS,
} from "./config/board.js";
import { setPlayerPosition } from "./movement.js";
import type {
  DeckState,
  GameEvent,
  GameState,
  PlayerId,
  RNG,
} from "./types.js";
import { checkWinCondition } from "./win.js";

const CHANCE_MAP = new Map<string, Card>(CHANCE_CARDS.map((c) => [c.id, c]));
const CC_MAP = new Map<string, Card>(
  COMMUNITY_CHEST_CARDS.map((c) => [c.id, c]),
);

export function lookupCard(
  deck: "chance" | "community_chest",
  cardId: string,
): Card | undefined {
  return deck === "chance" ? CHANCE_MAP.get(cardId) : CC_MAP.get(cardId);
}

function nearestOf(current: number, candidates: readonly number[]): number {
  let best = candidates[0];
  let bestDist = BOARD_SIZE;
  for (const pos of candidates) {
    const dist = (pos - current + BOARD_SIZE) % BOARD_SIZE;
    if (dist > 0 && dist < bestDist) {
      bestDist = dist;
      best = pos;
    }
  }
  return best;
}

function reshuffleDiscard(deck: DeckState, rng: RNG): void {
  deck.drawPile = [...deck.discardPile];
  deck.discardPile = [];
  for (let i = deck.drawPile.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck.drawPile[i], deck.drawPile[j]] = [deck.drawPile[j], deck.drawPile[i]];
  }
}

export function drawCardId(deck: DeckState, rng: RNG): string | null {
  if (deck.drawPile.length === 0) {
    reshuffleDiscard(deck, rng);
  }
  return deck.drawPile.shift() ?? null;
}

/**
 * Apply a card's effect to game state.
 *
 * Contract for callers (ACKNOWLEDGE_CARD in index.ts):
 * - Does NOT set state.phase — caller is responsible for all phase transitions.
 * - get_out_of_jail_free: does NOT push card to discard (stays with player until spent).
 * - Movement effects (move_to, move_relative, move_to_nearest, go_back_spaces):
 *   moves the player but does NOT call resolveLanding — caller must do that.
 * - go_to_jail: sends player to jail but does NOT set END_TURN phase.
 */
export function applyCardEffect(
  state: GameState,
  playerId: PlayerId,
  card: Card,
  deckKey: "chance" | "community_chest",
  rng: RNG,
): GameEvent[] {
  const events: GameEvent[] = [];
  const player = state.players[playerId];
  const effect = card.effect;
  const deck =
    deckKey === "chance" ? state.chanceDeck : state.communityChestDeck;

  switch (effect.kind) {
    case "get_out_of_jail_free": {
      player.goojfCards += 1;
      player.goojfCardSources.push(deckKey);
      // NOTE: Card stays out of discard while held; returned to discard when spent.
      return events;
    }

    case "cash": {
      player.cash += effect.amount;
      if (effect.amount < 0) {
        events.push(...checkBankruptcy(state, playerId, null));
        events.push(...checkWinCondition(state));
      }
      break;
    }

    case "cash_per_player": {
      const others = state.turnOrder.filter(
        (id) => id !== playerId && !state.players[id].isBankrupt,
      );
      if (effect.amount > 0) {
        for (const otherId of others) {
          state.players[otherId].cash -= effect.amount;
          player.cash += effect.amount;
          events.push(...checkBankruptcy(state, otherId, playerId));
          events.push(...checkWinCondition(state));
          if (state.winnerId) {
            deck.discardPile.push(card.id);
            return events;
          }
        }
      } else {
        for (const otherId of others) {
          player.cash += effect.amount;
          state.players[otherId].cash -= effect.amount;
        }
        events.push(...checkBankruptcy(state, playerId, null));
        events.push(...checkWinCondition(state));
      }
      break;
    }

    case "go_to_jail": {
      player.position = JAIL_POSITION;
      player.isInJail = true;
      player.jailState = { turnsInJail: 0, hasGetOutOfJailFreeCard: false };
      events.push({ type: "SENT_TO_JAIL", playerId });
      break;
    }

    case "repairs": {
      let total = 0;
      for (const pos of player.ownedPositions) {
        total += (player.houses[pos] ?? 0) * effect.houseCost;
        total += (player.hotels[pos] ?? 0) * effect.hotelCost;
      }
      player.cash -= total;
      events.push(...checkBankruptcy(state, playerId, null));
      events.push(...checkWinCondition(state));
      break;
    }

    case "move_to": {
      events.push(...setPlayerPosition(state, playerId, effect.position, true));
      break;
    }

    case "move_relative": {
      const newPos =
        (((player.position + effect.spaces) % BOARD_SIZE) + BOARD_SIZE) %
        BOARD_SIZE;
      events.push(
        ...setPlayerPosition(state, playerId, newPos, effect.spaces > 0),
      );
      break;
    }

    case "go_back_spaces": {
      // Go backward — no Go collection.
      player.position =
        (player.position - effect.spaces + BOARD_SIZE) % BOARD_SIZE;
      break;
    }

    case "move_to_nearest": {
      const candidates =
        effect.tileType === "railroad" ? RAILROAD_POSITIONS : UTILITY_POSITIONS;
      const targetPos = nearestOf(player.position, candidates);
      events.push(...setPlayerPosition(state, playerId, targetPos, true));
      // NOTE: Double railroad rent / 10× utility roll applied in resolveLanding via ACKNOWLEDGE_CARD options.
      break;
    }
  }

  deck.discardPile.push(card.id);
  // Suppress unused rng warning — rng is reserved for future use within this function.
  void rng;
  return events;
}

export const MOVEMENT_EFFECT_KINDS = new Set([
  "move_to",
  "move_relative",
  "move_to_nearest",
  "go_back_spaces",
]);
