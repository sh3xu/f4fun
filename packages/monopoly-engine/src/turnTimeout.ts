import { getCurrentAuctionBidder } from "./auction.js";
import { phaseAfterDiceAction } from "./phase.js";
import { getActivePlayer } from "./turn.js";
import type {
  GameAction,
  GameConfig,
  GamePhase,
  GameState,
  PlayerId,
} from "./types.js";
import { CARD_REVEAL_PAUSE_MS } from "./types.js";

/** Heal RAISE_CASH left with no pendingDebt (e.g. pre-fix force-settle). */
export function healStuckRaiseCash(state: GameState): boolean {
  if (state.phase !== "RAISE_CASH" || state.pendingDebt) return false;

  const activeId = getActivePlayer(state);
  const player = activeId ? state.players[activeId] : null;
  state.phase = player?.isBankrupt ? "END_TURN" : phaseAfterDiceAction(state);
  return true;
}

export function timeoutSecsForPhase(
  phase: GamePhase,
  config: GameConfig,
): number | null {
  switch (phase) {
    case "PRE_ROLL":
    case "CARD_DRAWN":
      return config.shortTimeoutSecs;
    case "END_TURN":
      return config.endTurnTimeoutSecs;
    case "JAIL_DECISION":
    case "BUY_OR_DECLINE":
      return config.longTimeoutSecs;
    case "AUCTION":
      return config.auctionTimeoutSecs;
    case "RAISE_CASH":
      return config.raiseCashTimeoutSecs;
    default:
      return null;
  }
}

export interface TimeoutAction {
  action: GameAction;
  actorId: PlayerId;
}

/** Safe auto-action when the phase deadline expires. Never spends money. Pure — does not mutate. */
export function timeoutActionForState(state: GameState): TimeoutAction | null {
  // NOTE: Turn clock is frozen while a trade offer awaits a response.
  if (state.pendingTrades.length > 0) {
    return null;
  }

  // NOTE: Parent phase timer is paused during auction; auction has its own deadline.
  if (state.actionDeadlinePausedMs != null && state.phase !== "AUCTION") {
    return null;
  }

  // NOTE: Issue #42 — stuck RAISE_CASH with no debt; suggest post-heal action without mutating.
  if (state.phase === "RAISE_CASH" && !state.pendingDebt) {
    const actorId = getActivePlayer(state);
    if (!actorId) return null;
    const player = state.players[actorId];
    const healedPhase = player?.isBankrupt
      ? "END_TURN"
      : phaseAfterDiceAction(state);
    if (healedPhase === "PRE_ROLL") {
      return { action: { type: "ROLL_DICE" }, actorId };
    }
    return { action: { type: "END_TURN" }, actorId };
  }

  switch (state.phase) {
    case "PRE_ROLL": {
      const actorId = getActivePlayer(state);
      if (!actorId) return null;
      return { action: { type: "ROLL_DICE" }, actorId };
    }
    case "JAIL_DECISION": {
      const actorId = getActivePlayer(state);
      if (!actorId) return null;
      return { action: { type: "ROLL_FOR_JAIL" }, actorId };
    }
    case "BUY_OR_DECLINE": {
      const actorId = getActivePlayer(state);
      if (!actorId) return null;
      return { action: { type: "DECLINE_PROPERTY" }, actorId };
    }
    case "CARD_DRAWN": {
      const actorId = getActivePlayer(state);
      if (!actorId) return null;
      return { action: { type: "ACKNOWLEDGE_CARD" }, actorId };
    }
    case "END_TURN": {
      const actorId = getActivePlayer(state);
      if (!actorId) return null;
      return { action: { type: "END_TURN" }, actorId };
    }
    case "AUCTION": {
      const actorId = getCurrentAuctionBidder(state);
      if (!actorId) return null;
      return { action: { type: "PASS_AUCTION" }, actorId };
    }
    case "RAISE_CASH": {
      const debtorId = state.pendingDebt?.playerId;
      if (!debtorId) return null;
      return { action: { type: "FORCE_SETTLE_DEBT" }, actorId: debtorId };
    }
    default:
      return null;
  }
}

export function stampActionDeadline(
  state: GameState,
  nowMs: number = Date.now(),
): void {
  const secs = timeoutSecsForPhase(state.phase, state.config);
  // NOTE: Keep parent-phase remaining ms while the auction clock runs.
  if (state.phase !== "AUCTION") {
    state.actionDeadlinePausedMs = null;
  }
  if (secs == null) {
    state.actionDeadlineAt = null;
    return;
  }

  let deadlineMs = nowMs + secs * 1000;
  // NOTE: Auto-ack must not fire before the card reveal pause ends.
  if (state.phase === "CARD_DRAWN" && state.pendingCard?.drawnAt) {
    const drawnMs = Date.parse(state.pendingCard.drawnAt);
    if (Number.isFinite(drawnMs)) {
      deadlineMs = Math.max(deadlineMs, drawnMs + CARD_REVEAL_PAUSE_MS);
    }
  }

  state.actionDeadlineAt = new Date(deadlineMs).toISOString();
}

/** Freeze remaining turn time while a trade offer is pending or auction runs. */
export function pauseActionDeadline(
  state: GameState,
  nowMs: number = Date.now(),
): void {
  if (state.actionDeadlinePausedMs != null) return;
  if (!state.actionDeadlineAt) {
    state.actionDeadlinePausedMs = null;
    return;
  }
  state.actionDeadlinePausedMs = Math.max(
    0,
    new Date(state.actionDeadlineAt).getTime() - nowMs,
  );
  state.actionDeadlineAt = null;
}

/** Resume the turn clock from the paused remaining ms. */
export function resumeActionDeadline(
  state: GameState,
  nowMs: number = Date.now(),
): void {
  if (state.actionDeadlinePausedMs == null) return;

  const remainingMs = state.actionDeadlinePausedMs;
  state.actionDeadlinePausedMs = null;

  if (timeoutSecsForPhase(state.phase, state.config) == null) {
    state.actionDeadlineAt = null;
    return;
  }

  state.actionDeadlineAt = new Date(nowMs + remainingMs).toISOString();
}

/**
 * True when the turn-phase deadline has elapsed (or paused remaining is 0).
 * NOTE: Issue #55 — pending trades use their own expiry; turn clock stays frozen.
 */
export function isActionDeadlineExpired(
  state: GameState,
  nowMs: number = Date.now(),
): boolean {
  if (state.pendingTrades.length > 0) return false;
  if (state.actionDeadlinePausedMs != null) {
    return state.actionDeadlinePausedMs <= 0;
  }
  if (!state.actionDeadlineAt) return false;
  return new Date(state.actionDeadlineAt).getTime() <= nowMs;
}
