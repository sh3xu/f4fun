import { describe, expect, it } from "vitest";
import { createInitialState } from "../index.js";
import {
  healStuckRaiseCash,
  isActionDeadlineExpired,
  pauseActionDeadline,
  resumeActionDeadline,
  stampActionDeadline,
  timeoutActionForState,
  timeoutSecsForPhase,
} from "../turnTimeout.js";
import { CARD_REVEAL_PAUSE_MS, DEFAULT_GAME_CONFIG } from "../types.js";

describe("turnTimeout", () => {
  it("maps phases to short, long, end-turn, and auction timeouts", () => {
    const cfg = DEFAULT_GAME_CONFIG;
    expect(timeoutSecsForPhase("PRE_ROLL", cfg)).toBe(10);
    expect(timeoutSecsForPhase("CARD_DRAWN", cfg)).toBe(10);
    expect(timeoutSecsForPhase("END_TURN", cfg)).toBe(60);
    expect(timeoutSecsForPhase("JAIL_DECISION", cfg)).toBe(30);
    expect(timeoutSecsForPhase("BUY_OR_DECLINE", cfg)).toBe(30);
    expect(timeoutSecsForPhase("AUCTION", cfg)).toBe(30);
    expect(timeoutSecsForPhase("RAISE_CASH", cfg)).toBe(60);
    expect(timeoutSecsForPhase("GAME_OVER", cfg)).toBeNull();
    expect(timeoutSecsForPhase("WAITING", cfg)).toBeNull();
  });

  it("picks safe auto-actions per phase", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.phase = "PRE_ROLL";
    expect(timeoutActionForState(state)).toEqual({
      action: { type: "ROLL_DICE" },
      actorId: "p1",
    });

    state.phase = "JAIL_DECISION";
    expect(timeoutActionForState(state)?.action.type).toBe("ROLL_FOR_JAIL");

    state.phase = "BUY_OR_DECLINE";
    expect(timeoutActionForState(state)?.action.type).toBe("DECLINE_PROPERTY");

    state.phase = "CARD_DRAWN";
    expect(timeoutActionForState(state)?.action.type).toBe("ACKNOWLEDGE_CARD");

    state.phase = "END_TURN";
    expect(timeoutActionForState(state)?.action.type).toBe("END_TURN");

    state.phase = "AUCTION";
    state.auction = {
      position: 1,
      kind: "bank",
      sellerId: null,
      highBid: 0,
      highBidderId: null,
      bidderOrder: ["p2", "p1"],
      currentBidderIndex: 0,
      minNextBid: 10,
      bidHistory: [],
      resumePhase: "END_TURN",
    };
    expect(timeoutActionForState(state)).toEqual({
      action: { type: "PASS_AUCTION" },
      actorId: "p2",
    });

    state.phase = "RAISE_CASH";
    state.pendingDebt = { playerId: "p1", creditorId: null };
    expect(timeoutActionForState(state)).toEqual({
      action: { type: "FORCE_SETTLE_DEBT" },
      actorId: "p1",
    });

    // Issue #42: stuck RAISE_CASH with no debt — suggest end-turn without mutating
    state.phase = "RAISE_CASH";
    state.pendingDebt = null;
    state.lastDice = [1, 2];
    state.allowDoublesReroll = true;
    expect(timeoutActionForState(state)).toEqual({
      action: { type: "END_TURN" },
      actorId: "p1",
    });
    expect(state.phase).toBe("RAISE_CASH");

    expect(healStuckRaiseCash(state)).toBe(true);
    expect(state.phase).toBe("END_TURN");

    state.phase = "GAME_OVER";
    expect(timeoutActionForState(state)).toBeNull();
  });

  it("suggests ROLL_DICE for stuck RAISE_CASH when doubles allow reroll", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.phase = "RAISE_CASH";
    state.pendingDebt = null;
    state.lastDice = [3, 3];
    state.allowDoublesReroll = true;
    expect(timeoutActionForState(state)).toEqual({
      action: { type: "ROLL_DICE" },
      actorId: "p1",
    });
    expect(state.phase).toBe("RAISE_CASH");
  });

  it("CARD_DRAWN deadline is no earlier than reveal pause", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.config.shortTimeoutSecs = 2;
    state.phase = "CARD_DRAWN";
    state.pendingCard = {
      deck: "chance",
      cardId: "ch_goojf",
      drawnAt: "2026-01-01T00:00:00.000Z",
    };
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    stampActionDeadline(state, now);
    expect(state.actionDeadlineAt).toBe(
      new Date(now + CARD_REVEAL_PAUSE_MS).toISOString(),
    );
  });

  it("stamps actionDeadlineAt from phase timeout", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.phase = "PRE_ROLL";
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    stampActionDeadline(state, now);
    expect(state.actionDeadlineAt).toBe("2026-01-01T00:00:10.000Z");

    state.phase = "GAME_OVER";
    stampActionDeadline(state, now);
    expect(state.actionDeadlineAt).toBeNull();
  });

  it("pauses and resumes the turn deadline without reset", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.phase = "PRE_ROLL";
    const t0 = Date.parse("2026-01-01T00:00:00.000Z");
    stampActionDeadline(state, t0);

    const t1 = t0 + 4000;
    pauseActionDeadline(state, t1);
    expect(state.actionDeadlineAt).toBeNull();
    expect(state.actionDeadlinePausedMs).toBe(6000);
    expect(timeoutActionForState(state)).toBeNull();

    const t2 = t1 + 30_000;
    resumeActionDeadline(state, t2);
    expect(state.actionDeadlinePausedMs).toBeNull();
    expect(state.actionDeadlineAt).toBe("2026-01-01T00:00:40.000Z");
  });

  it("reports expired when deadline is in the past", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.phase = "END_TURN";
    state.actionDeadlineAt = "2020-01-01T00:00:00.000Z";
    expect(isActionDeadlineExpired(state)).toBe(true);

    state.actionDeadlineAt = null;
    state.actionDeadlinePausedMs = 0;
    expect(isActionDeadlineExpired(state)).toBe(true);

    state.actionDeadlinePausedMs = 5000;
    expect(isActionDeadlineExpired(state)).toBe(false);
  });
});
