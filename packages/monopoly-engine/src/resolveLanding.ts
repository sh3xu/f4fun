import { checkBankruptcy } from "./bankruptcy.js";
import {
  GO_TO_JAIL_POSITION,
  JAIL_POSITION,
  TILE_BY_POSITION,
} from "./config/board.js";
import { chargeRent } from "./rent.js";
import type { GameEvent, GameState, PlayerId } from "./types.js";
import { checkWinCondition } from "./win.js";

export interface ResolveLandingOptions {
  /** When false (jail doubles / forced exit), doubles do not grant another roll. */
  allowDoublesReroll: boolean;
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
  const isDoubles =
    options.allowDoublesReroll &&
    state.lastDice !== null &&
    state.lastDice[0] === state.lastDice[1];

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

    events.push(...checkBankruptcy(state, playerId, null));
    events.push(...checkWinCondition(state));

    if (state.winnerId !== null) {
      return events;
    }

    state.phase = isDoubles ? "PRE_ROLL" : "END_TURN";
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

    events.push(...checkBankruptcy(state, playerId, ownership.ownerId));
    events.push(...checkWinCondition(state));

    if (state.winnerId !== null) {
      return events;
    }

    state.phase = isDoubles ? "PRE_ROLL" : "END_TURN";
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

  state.phase = isDoubles ? "PRE_ROLL" : "END_TURN";
  return events;
}
