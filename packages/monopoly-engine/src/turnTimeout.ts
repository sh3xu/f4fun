import { getCurrentAuctionBidder } from "./auction.js";
import { getActivePlayer } from "./turn.js";
import type {
  GameAction,
  GameConfig,
  GamePhase,
  GameState,
  PlayerId,
} from "./types.js";

export function timeoutSecsForPhase(
  phase: GamePhase,
  config: GameConfig,
): number | null {
  switch (phase) {
    case "PRE_ROLL":
    case "CARD_DRAWN":
    case "END_TURN":
      return config.shortTimeoutSecs;
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

/** Safe auto-action when the phase deadline expires. Never spends money. */
export function timeoutActionForState(state: GameState): TimeoutAction | null {
  // NOTE: Turn clock is frozen while a trade offer awaits a response.
  if (state.pendingTrades.length > 0) {
    return null;
  }

  // NOTE: Parent phase timer is paused during auction; auction has its own deadline.
  if (state.actionDeadlinePausedMs != null && state.phase !== "AUCTION") {
    return null;
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
  state.actionDeadlineAt =
    secs == null ? null : new Date(nowMs + secs * 1000).toISOString();
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
