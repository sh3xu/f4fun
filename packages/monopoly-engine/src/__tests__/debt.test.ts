import { describe, expect, it } from "vitest";
import {
  applyAction,
  createInitialState,
  enterRaiseCashIfNeeded,
} from "../index.js";
import type { GameEvent } from "../types.js";

function seededRng(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("debt and raise-cash", () => {
  it("enters raise-cash instead of instant bankruptcy", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.players.p1.cash = 10;
    state.players.p1.position = 35;
    state.ownership[39] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(39);

    const result = applyAction(
      state,
      { type: "ROLL_DICE" },
      seededRng([0.3, 0.3]),
    );
    expect(result.error).toBeUndefined();
    expect(state.phase).toBe("RAISE_CASH");
    expect(state.pendingDebt?.playerId).toBe("p1");
    expect(result.events.some((e) => e.type === "DEBT_RAISED")).toBe(true);
  });

  it("resolves debt and exits raise-cash after sell-to-bank", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.phase = "RAISE_CASH";
    state.players.p1.cash = -20;
    state.players.p1.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.pendingDebt = { playerId: "p1", creditorId: "p2" };

    const result = applyAction(
      state,
      { type: "SELL_PROPERTY_TO_BANK", position: 1 },
      Math.random,
      "p1",
    );
    expect(result.error).toBeUndefined();
    expect(result.events.some((e) => e.type === "DEBT_RESOLVED")).toBe(true);
    expect(state.pendingDebt).toBeNull();
    expect(state.phase).not.toBe("RAISE_CASH");
  });

  it("lets the active debtor sell assets during raise-cash", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.activePlayerIndex = 0;
    state.phase = "RAISE_CASH";
    state.players.p1.cash = -20;
    state.players.p1.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.pendingDebt = { playerId: "p1", creditorId: "p2" };

    const result = applyAction(
      state,
      { type: "SELL_PROPERTY_TO_BANK", position: 1 },
      Math.random,
      "p1",
    );
    expect(result.error).toBeUndefined();
    expect(result.events.some((e) => e.type === "DEBT_RESOLVED")).toBe(true);
  });

  it("defers off-turn negative cash until the debtor's turn", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
      { id: "p3", name: "Carol", token: "dog" },
    ]);
    state.activePlayerIndex = 0;
    state.phase = "END_TURN";
    state.players.p2.cash = 5;
    state.players.p2.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p2", isMortgaged: false };

    // Simulate birthday: p2 goes negative while p1 is active — no RAISE_CASH yet.
    state.players.p2.cash = -5;
    const deferredEvents: GameEvent[] = [];
    expect(enterRaiseCashIfNeeded(state, "p2", "p1", deferredEvents)).toBe(
      false,
    );
    expect(state.phase).toBe("END_TURN");
    expect(state.pendingDebt).toBeNull();
    expect(state.players.p2.cash).toBe(-5);

    const end = applyAction(state, { type: "END_TURN" }, Math.random, "p1");
    expect(end.error).toBeUndefined();
    // p2 is next
    expect(state.activePlayerIndex).toBe(1);
    expect(state.phase).toBe("RAISE_CASH");
    expect(state.pendingDebt?.playerId).toBe("p2");
    expect(state.pendingDebt?.resumePhase).toBe("PRE_ROLL");
    expect(end.events.some((e) => e.type === "DEBT_RAISED")).toBe(true);
  });

  it("does not reopen RAISE_CASH when advanceTurn no-ops with one solvent player", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.activePlayerIndex = 0;
    state.phase = "END_TURN";
    state.players.p1.cash = -40;
    state.players.p1.isBankrupt = true;
    state.players.p2.cash = 1500;

    const result = applyAction(state, { type: "END_TURN" }, Math.random, "p1");
    expect(result.error).toBeUndefined();
    expect(result.events.some((e) => e.type === "TURN_ADVANCED")).toBe(false);
    expect(state.phase).toBe("END_TURN");
    expect(state.pendingDebt).toBeNull();
    expect(state.activePlayerIndex).toBe(0);
  });

  it("restores PRE_ROLL after turn-start raise-cash resolves", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.phase = "RAISE_CASH";
    state.players.p1.cash = -20;
    state.players.p1.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.pendingDebt = {
      playerId: "p1",
      creditorId: null,
      resumePhase: "PRE_ROLL",
    };
    // Stale doubles from a previous turn must not force PRE_ROLL incorrectly via dice.
    state.lastDice = [4, 4];
    state.allowDoublesReroll = true;

    const result = applyAction(
      state,
      { type: "SELL_PROPERTY_TO_BANK", position: 1 },
      Math.random,
      "p1",
    );
    expect(result.error).toBeUndefined();
    expect(state.phase).toBe("PRE_ROLL");
  });

  it("force-settles debt on timeout", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.phase = "RAISE_CASH";
    state.players.p1.cash = -50;
    state.players.p1.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.pendingDebt = { playerId: "p1", creditorId: "p2" };

    const result = applyAction(
      state,
      { type: "FORCE_SETTLE_DEBT" },
      Math.random,
      "p1",
    );
    expect(result.error).toBeUndefined();
    expect(state.pendingDebt).toBeNull();
    expect(
      result.events.some(
        (e) => e.type === "DEBT_RESOLVED" || e.type === "PLAYER_BANKRUPT",
      ),
    ).toBe(true);
  });

  // Regression: issue #42 — force-settle covered debt but left RAISE_CASH with
  // null pendingDebt, so roll/end-turn UI never appeared and the timer no-oped.
  it("exits raise-cash after force-settle covers debt with assets", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.phase = "RAISE_CASH";
    state.players.p1.cash = -50;
    state.players.p1.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.pendingDebt = { playerId: "p1", creditorId: "p2" };
    state.lastDice = [2, 3];
    state.allowDoublesReroll = true;

    const result = applyAction(
      state,
      { type: "FORCE_SETTLE_DEBT" },
      Math.random,
      "p1",
    );
    expect(result.error).toBeUndefined();
    expect(result.events.some((e) => e.type === "DEBT_RESOLVED")).toBe(true);
    expect(state.pendingDebt).toBeNull();
    expect(state.players.p1.cash).toBeGreaterThanOrEqual(0);
    expect(state.phase).toBe("END_TURN");
  });

  it("returns to PRE_ROLL after force-settle when doubles allow reroll", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.phase = "RAISE_CASH";
    state.players.p1.cash = -20;
    state.players.p1.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.pendingDebt = { playerId: "p1", creditorId: "p2" };
    state.lastDice = [4, 4];
    state.allowDoublesReroll = true;

    const result = applyAction(
      state,
      { type: "FORCE_SETTLE_DEBT" },
      Math.random,
      "p1",
    );
    expect(result.error).toBeUndefined();
    expect(state.pendingDebt).toBeNull();
    expect(state.phase).toBe("PRE_ROLL");
  });

  it("preserves BUY_OR_DECLINE after pending jail move lands on unowned property", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.phase = "RAISE_CASH";
    state.players.p1.cash = -20;
    state.players.p1.position = 10;
    state.players.p1.isInJail = false;
    state.players.p1.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    // 1+2 from jail (10) → States Avenue (13), unowned
    state.pendingDebt = {
      playerId: "p1",
      creditorId: null,
      pendingJailMove: { dice: [1, 2], spaces: 3 },
    };

    const result = applyAction(
      state,
      { type: "FORCE_SETTLE_DEBT" },
      Math.random,
      "p1",
    );
    expect(result.error).toBeUndefined();
    expect(result.events.some((e) => e.type === "DEBT_RESOLVED")).toBe(true);
    expect(state.players.p1.position).toBe(13);
    expect(state.phase).toBe("BUY_OR_DECLINE");
  });
});
