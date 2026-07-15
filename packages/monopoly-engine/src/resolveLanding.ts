import { drawCardId } from "./cards.js";
import {
  GO_TO_JAIL_POSITION,
  JAIL_POSITION,
  TILE_BY_POSITION,
} from "./config/board.js";
import { phaseAfterDiceAction, settleAfterCashChange } from "./phase.js";
import { chargeRent } from "./rent.js";
import type { GameEvent, GameState, PlayerId, RNG } from "./types.js";

export interface ResolveLandingOptions {
  /** When false (jail doubles / forced exit), doubles do not grant another roll. */
  allowDoublesReroll: boolean;
  /** RNG used for reshuffling an empty draw pile. Defaults to Math.random. */
  rng?: RNG;
}

/**
 * Apply tile effects after the player has already moved to their landing square.
 * Mutates state.phase (and may set winner).
 */
export function resolveLanding(
  state: GameState,
  playerId: PlayerId,
  diceSpaces: number,
  options: ResolveLandingOptions,
): GameEvent[] {
  const events: GameEvent[] = [];
  const player = state.players[playerId];

  // Persist for buy/decline/auction/card flows that resume after this landing.
  state.allowDoublesReroll = options.allowDoublesReroll;

  if (player.position === GO_TO_JAIL_POSITION) {
    player.position = JAIL_POSITION;
    player.isInJail = true;
    player.jailState = { turnsInJail: 0, hasGetOutOfJailFreeCard: false };
    events.push({ type: "SENT_TO_JAIL", playerId });
    state.phase = "END_TURN";
    return events;
  }

  const tile = TILE_BY_POSITION.get(player.position);
  if (tile?.type === "tax") {
    player.cash -= tile.amount;
    events.push({
      type: "TAX_PAID",
      playerId,
      amount: tile.amount,
    });
    settleAfterCashChange(state, playerId, null, events);
    return events;
  }

  const ownership = state.ownership[player.position];
  if (ownership && ownership.ownerId !== playerId) {
    events.push(
      ...chargeRent(
        state,
        playerId,
        ownership.ownerId,
        player.position,
        diceSpaces,
      ),
    );
    settleAfterCashChange(state, playerId, ownership.ownerId, events);
    return events;
  }

  if (
    tile &&
    (tile.type === "property" ||
      tile.type === "railroad" ||
      tile.type === "utility") &&
    !ownership
  ) {
    state.phase = "BUY_OR_DECLINE";
    return events;
  }

  if (tile?.type === "chance" || tile?.type === "community_chest") {
    const deckKey = tile.type === "chance" ? "chance" : "community_chest";
    const deck =
      deckKey === "chance" ? state.chanceDeck : state.communityChestDeck;
    const effectiveRng = options.rng ?? Math.random;
    const cardId = drawCardId(deck, effectiveRng);

    if (cardId !== null) {
      state.pendingCard = { deck: deckKey, cardId };
      state.phase = "CARD_DRAWN";
      events.push({ type: "CARD_DRAWN", playerId, deck: deckKey, cardId });
      return events;
    }
  }

  state.phase = phaseAfterDiceAction(state);
  return events;
}
