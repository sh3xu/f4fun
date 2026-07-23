import { checkBankruptcy } from "./bankruptcy.js";
import { autoLiquidateAssets } from "./liquidate.js";
import { applyMove } from "./movement.js";
import { phaseAfterDiceAction } from "./phase.js";
import { resolveLanding } from "./resolveLanding.js";
import { getActivePlayer } from "./turn.js";
import type {
  GameEvent,
  GamePhase,
  GameState,
  PendingDebt,
  PlayerId,
  RNG,
} from "./types.js";
import { checkWinCondition } from "./win.js";

export type EnterRaiseCashOptions = {
  /** Restore this phase after debt clears (turn-start debt before roll/jail choice). */
  resumePhase?: PendingDebt["resumePhase"];
};

/**
 * Enter RAISE_CASH only for the active player.
 * NOTE: Off-turn negative cash (e.g. birthday) is deferred until their turn starts.
 */
export function enterRaiseCashIfNeeded(
  state: GameState,
  playerId: PlayerId,
  creditorId: PlayerId | null,
  events: GameEvent[],
  options?: EnterRaiseCashOptions,
): boolean {
  const player = state.players[playerId];
  if (!player || player.cash >= 0) return false;

  if (playerId !== getActivePlayer(state)) {
    return false;
  }

  state.pendingDebt = {
    playerId,
    creditorId,
    ...(options?.resumePhase ? { resumePhase: options.resumePhase } : {}),
  };
  state.phase = "RAISE_CASH";
  events.push({
    type: "DEBT_RAISED",
    playerId,
    creditorId,
    amountNeeded: -player.cash,
  });
  return true;
}

/**
 * After END_TURN advances, force the new active player to raise cash if negative.
 */
export function enterRaiseCashAtTurnStart(
  state: GameState,
  events: GameEvent[],
): boolean {
  const playerId = getActivePlayer(state);
  if (!playerId) return false;

  const resumePhase: PendingDebt["resumePhase"] =
    state.phase === "JAIL_DECISION" ? "JAIL_DECISION" : "PRE_ROLL";

  return enterRaiseCashIfNeeded(state, playerId, null, events, {
    resumePhase,
  });
}

function phaseAfterDebtCleared(
  state: GameState,
  playerId: PlayerId,
  debt: PendingDebt,
): GamePhase {
  const player = state.players[playerId];
  if (!player || player.isBankrupt) return "END_TURN";
  if (debt.resumePhase) return debt.resumePhase;
  return phaseAfterDiceAction(state);
}

function completePendingJailMove(
  state: GameState,
  playerId: PlayerId,
  pendingJailMove: { dice: [number, number]; spaces: number },
  rng: RNG,
  events: GameEvent[],
): void {
  events.push(...applyMove(state, playerId, pendingJailMove.spaces));
  events.push({
    type: "DICE_ROLLED",
    playerId,
    dice: pendingJailMove.dice,
    newPosition: state.players[playerId]?.position ?? 0,
  });
  events.push(
    ...resolveLanding(state, playerId, pendingJailMove.spaces, {
      allowDoublesReroll: false,
      rng,
    }),
  );
}

export function tryResolveRaiseCash(
  state: GameState,
  events: GameEvent[],
  rng: RNG = Math.random,
): boolean {
  if (state.phase !== "RAISE_CASH" || !state.pendingDebt) return false;

  const debt = state.pendingDebt;
  const { playerId, pendingJailMove } = debt;
  const player = state.players[playerId];
  if (!player || player.cash < 0) return false;

  state.pendingDebt = null;
  events.push({ type: "DEBT_RESOLVED", playerId });

  // NOTE: resolveLanding may leave BUY_OR_DECLINE / CARD_DRAWN / RAISE_CASH / etc.
  if (pendingJailMove) {
    completePendingJailMove(state, playerId, pendingJailMove, rng, events);
    return true;
  }

  if (state.winnerId !== null) return true;

  state.phase = phaseAfterDebtCleared(state, playerId, debt);
  return true;
}

export function forceSettleDebt(
  state: GameState,
  rng: RNG = Math.random,
): GameEvent[] {
  const events: GameEvent[] = [];
  if (state.phase !== "RAISE_CASH" || !state.pendingDebt) {
    return events;
  }

  const debt = state.pendingDebt;
  const { playerId, creditorId, pendingJailMove } = debt;
  const player = state.players[playerId];
  if (!player) {
    state.pendingDebt = null;
    return events;
  }

  while (player.cash < 0) {
    const before = player.cash;
    const raised = autoLiquidateAssets(state, playerId);
    if (raised.length === 0 || player.cash === before) break;
    events.push(...raised);
  }

  state.pendingDebt = null;

  if (player.cash >= 0) {
    events.push({ type: "DEBT_RESOLVED", playerId });
    // NOTE: resolveLanding may leave BUY_OR_DECLINE / CARD_DRAWN / RAISE_CASH / etc.
    if (pendingJailMove) {
      completePendingJailMove(state, playerId, pendingJailMove, rng, events);
      return events;
    }
    if (state.winnerId !== null) return events;
    state.phase = phaseAfterDebtCleared(state, playerId, debt);
    return events;
  }

  events.push(...checkBankruptcy(state, playerId, creditorId));
  events.push(...checkWinCondition(state));

  if (state.winnerId !== null) return events;

  state.phase = phaseAfterDebtCleared(state, playerId, debt);

  return events;
}
