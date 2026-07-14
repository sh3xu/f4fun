import { describe, expect, it } from "vitest";
import { applyAction, createInitialState } from "../index.js";
import type { GameState } from "../types.js";

function seededRng(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

function putInJail(state: GameState, playerId: string): void {
  const player = state.players[playerId];
  player.position = 10;
  player.isInJail = true;
  player.jailState = { turnsInJail: 0, hasGetOutOfJailFreeCard: false };
}

/** End the previous player's turn so the jailed player enters JAIL_DECISION. */
function startJailedTurn(state: GameState, jailedId = "p1"): void {
  const jailedIndex = state.turnOrder.indexOf(jailedId);
  state.activePlayerIndex =
    (jailedIndex + state.turnOrder.length - 1) % state.turnOrder.length;
  state.phase = "END_TURN";
  const end = applyAction(state, { type: "END_TURN" });
  expect(end.error).toBeUndefined();
  expect(state.phase).toBe("JAIL_DECISION");
  expect(state.turnOrder[state.activePlayerIndex]).toBe(jailedId);
}

describe("jail exit", () => {
  it("enters JAIL_DECISION when a jailed player's turn starts", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    putInJail(state, "p1");
    startJailedTurn(state);
    expect(state.players.p1.isInJail).toBe(true);
  });

  it("releases player who pays the $50 fine", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    putInJail(state, "p1");
    startJailedTurn(state);

    const cashBefore = state.players.p1.cash;
    const result = applyAction(state, { type: "PAY_JAIL_FINE" });

    expect(result.error).toBeUndefined();
    expect(state.players.p1.isInJail).toBe(false);
    expect(state.players.p1.jailState).toBeNull();
    expect(state.players.p1.cash).toBe(cashBefore - 50);
    expect(state.phase).toBe("PRE_ROLL");
    expect(result.events).toContainEqual({
      type: "RELEASED_FROM_JAIL",
      playerId: "p1",
      method: "fine",
    });
  });

  it("releases player who uses a Get Out of Jail Free card", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    putInJail(state, "p1");
    state.players.p1.goojfCards = 1;
    startJailedTurn(state);

    const result = applyAction(state, { type: "USE_GOOJF_CARD" });

    expect(result.error).toBeUndefined();
    expect(state.players.p1.isInJail).toBe(false);
    expect(state.players.p1.goojfCards).toBe(0);
    expect(state.phase).toBe("PRE_ROLL");
    expect(result.events).toContainEqual({
      type: "RELEASED_FROM_JAIL",
      playerId: "p1",
      method: "card",
    });
  });

  it("rejects GOOJF when player has no card", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    putInJail(state, "p1");
    startJailedTurn(state);

    const result = applyAction(state, { type: "USE_GOOJF_CARD" });
    expect(result.error).toBeDefined();
    expect(state.players.p1.isInJail).toBe(true);
    expect(state.phase).toBe("JAIL_DECISION");
  });

  it("releases and moves when rolling doubles in jail", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    putInJail(state, "p1");
    startJailedTurn(state);

    // 4+4 doubles
    const rng = seededRng([0.5, 0.5]);
    const result = applyAction(state, { type: "ROLL_FOR_JAIL" }, rng);

    expect(result.error).toBeUndefined();
    expect(state.players.p1.isInJail).toBe(false);
    expect(state.players.p1.position).toBe(18);
    expect(state.lastDice).toEqual([4, 4]);
    expect(result.events).toContainEqual({
      type: "RELEASED_FROM_JAIL",
      playerId: "p1",
      method: "doubles",
    });
    // Doubles only free you from jail — no extra roll
    expect(state.phase).not.toBe("PRE_ROLL");
  });

  it("stays in jail and ends turn when roll is not doubles", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    putInJail(state, "p1");
    startJailedTurn(state);

    // 1+2 — not doubles
    const rng = seededRng([0.0, 0.2]);
    const result = applyAction(state, { type: "ROLL_FOR_JAIL" }, rng);

    expect(result.error).toBeUndefined();
    expect(state.players.p1.isInJail).toBe(true);
    expect(state.players.p1.jailState?.turnsInJail).toBe(1);
    expect(state.phase).toBe("END_TURN");
    expect(result.events).toContainEqual({
      type: "JAIL_TURN_FAILED",
      playerId: "p1",
      turnsInJail: 1,
    });
  });

  it("forces pay and move after third failed doubles attempt", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    putInJail(state, "p1");
    state.players.p1.jailState = {
      turnsInJail: 2,
      hasGetOutOfJailFreeCard: false,
    };
    startJailedTurn(state);

    const cashBefore = state.players.p1.cash;
    // 1+2 — not doubles on third attempt
    const rng = seededRng([0.0, 0.2]);
    const result = applyAction(state, { type: "ROLL_FOR_JAIL" }, rng);

    expect(result.error).toBeUndefined();
    expect(state.players.p1.isInJail).toBe(false);
    expect(state.players.p1.cash).toBe(cashBefore - 50);
    expect(state.players.p1.position).toBe(13); // 10 + 3
    expect(result.events).toContainEqual({
      type: "RELEASED_FROM_JAIL",
      playerId: "p1",
      method: "fine",
    });
  });

  it("rejects normal dice roll during JAIL_DECISION", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    putInJail(state, "p1");
    startJailedTurn(state);

    const roll = applyAction(state, { type: "ROLL_DICE" });
    expect(roll.error).toBe("Cannot roll dice now");
  });
});
