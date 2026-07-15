import { checkBankruptcy } from "./bankruptcy.js";
import { JAIL_FINE } from "./config/board.js";
import { diceSum, rollDice } from "./dice.js";
import { applyMove } from "./movement.js";
import { resolveLanding } from "./resolveLanding.js";
import type {
  ApplyResult,
  GameEvent,
  GameState,
  PlayerId,
  RNG,
} from "./types.js";
import { checkWinCondition } from "./win.js";

function requireJailDecision(
  state: GameState,
  playerId: PlayerId,
  activePlayerId: PlayerId,
): string | null {
  if (playerId !== activePlayerId) return "Not your turn";
  if (state.phase !== "JAIL_DECISION") return "Not in jail decision phase";
  const player = state.players[playerId];
  if (!player?.isInJail || !player.jailState) return "Player is not in jail";
  return null;
}

function releaseFromJail(
  state: GameState,
  playerId: PlayerId,
  method: "fine" | "card" | "doubles",
): GameEvent {
  const player = state.players[playerId];
  player.isInJail = false;
  player.jailState = null;
  return { type: "RELEASED_FROM_JAIL", playerId, method };
}

function leaveJailAndMove(
  state: GameState,
  playerId: PlayerId,
  method: "fine" | "doubles",
  dice: [number, number],
  spaces: number,
  rng: RNG,
): GameEvent[] {
  const events: GameEvent[] = [releaseFromJail(state, playerId, method)];
  events.push(...applyMove(state, playerId, spaces));
  events.push({
    type: "DICE_ROLLED",
    playerId,
    dice,
    newPosition: state.players[playerId].position,
  });
  events.push(
    ...resolveLanding(state, playerId, spaces, {
      allowDoublesReroll: false,
      rng,
    }),
  );
  return events;
}

/** Pay $50 to leave jail, then roll normally on PRE_ROLL. */
export function payJailFine(
  state: GameState,
  playerId: PlayerId,
  activePlayerId: PlayerId,
): ApplyResult {
  const gate = requireJailDecision(state, playerId, activePlayerId);
  if (gate) return { state, events: [], error: gate };

  const player = state.players[playerId];
  if (player.cash < JAIL_FINE) {
    return { state, events: [], error: "Not enough cash to pay jail fine" };
  }

  player.cash -= JAIL_FINE;
  if (state.config.freeParkingJackpot) {
    state.freeParkingPool += JAIL_FINE;
  }

  const events = [releaseFromJail(state, playerId, "fine")];
  state.phase = "PRE_ROLL";
  return { state, events };
}

/** Spend a Get Out of Jail Free card, then roll normally on PRE_ROLL. */
export function spendGoojfCard(
  state: GameState,
  playerId: PlayerId,
  activePlayerId: PlayerId,
): ApplyResult {
  const gate = requireJailDecision(state, playerId, activePlayerId);
  if (gate) return { state, events: [], error: gate };

  const player = state.players[playerId];
  if (player.goojfCards < 1) {
    return { state, events: [], error: "No Get Out of Jail Free card" };
  }

  player.goojfCards -= 1;

  // Return the card to its originating deck's discard pile.
  const source = player.goojfCardSources.shift();
  if (source) {
    const deck =
      source === "chance" ? state.chanceDeck : state.communityChestDeck;
    const cardId = source === "chance" ? "ch_goojf" : "cc_goojf";
    deck.discardPile.push(cardId);
  }

  const events = [releaseFromJail(state, playerId, "card")];
  state.phase = "PRE_ROLL";
  return { state, events };
}

/**
 * Attempt doubles to leave jail.
 * NOTE: Official rules — doubles free you and you move that amount, but you do not roll again.
 * After three failed attempts you must pay $50 and move with the third throw.
 */
export function rollForJail(
  state: GameState,
  playerId: PlayerId,
  activePlayerId: PlayerId,
  rng: RNG,
): ApplyResult {
  const gate = requireJailDecision(state, playerId, activePlayerId);
  if (gate) return { state, events: [], error: gate };

  const player = state.players[playerId];
  const { dice, isDoubles } = rollDice(rng);
  const spaces = diceSum(dice);
  state.lastDice = dice;

  if (isDoubles) {
    return {
      state,
      events: leaveJailAndMove(state, playerId, "doubles", dice, spaces, rng),
    };
  }

  const jailState = player.jailState;
  if (!jailState) {
    return { state, events: [], error: "Player is not in jail" };
  }

  jailState.turnsInJail += 1;

  if (jailState.turnsInJail < 3) {
    const events: GameEvent[] = [
      {
        type: "DICE_ROLLED",
        playerId,
        dice,
        newPosition: player.position,
      },
      {
        type: "JAIL_TURN_FAILED",
        playerId,
        turnsInJail: jailState.turnsInJail,
      },
    ];
    state.phase = "END_TURN";
    return { state, events };
  }

  // Third failed attempt: pay fine (cash may go negative), then move only if solvent.
  player.cash -= JAIL_FINE;
  if (state.config.freeParkingJackpot) {
    state.freeParkingPool += JAIL_FINE;
  }

  const bankruptEvents = checkBankruptcy(state, playerId, null);
  const winEvents = checkWinCondition(state);

  if (player.isBankrupt) {
    const events: GameEvent[] = [
      releaseFromJail(state, playerId, "fine"),
      {
        type: "DICE_ROLLED",
        playerId,
        dice,
        newPosition: player.position,
      },
      ...bankruptEvents,
      ...winEvents,
    ];
    if (state.winnerId === null) {
      state.phase = "END_TURN";
    }
    return { state, events };
  }

  return {
    state,
    events: leaveJailAndMove(state, playerId, "fine", dice, spaces, rng),
  };
}
