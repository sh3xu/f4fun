import { enterRaiseCashIfNeeded } from "./debt.js";
import type { GameEvent, GameState, PlayerId } from "./types.js";
import { checkWinCondition } from "./win.js";

/** Phase after a dice-driven landing when the player remains solvent. */
export function phaseAfterDiceAction(
  state: GameState,
): "PRE_ROLL" | "END_TURN" {
  if (!state.allowDoublesReroll) return "END_TURN";
  const dice = state.lastDice;
  if (dice !== null && dice[0] === dice[1]) return "PRE_ROLL";
  return "END_TURN";
}

/**
 * Run raise-cash / bankruptcy / win checks, then set phase.
 * Bankrupt players never receive a doubles reroll (multi-player games).
 */
export function settleAfterCashChange(
  state: GameState,
  playerId: PlayerId,
  creditorId: PlayerId | null,
  events: GameEvent[],
): void {
  if (enterRaiseCashIfNeeded(state, playerId, creditorId, events)) {
    return;
  }

  events.push(...checkWinCondition(state));

  if (state.winnerId !== null) return;

  if (state.players[playerId]?.isBankrupt) {
    state.phase = "END_TURN";
    return;
  }

  state.phase = phaseAfterDiceAction(state);
}
