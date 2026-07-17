import { describe, expect, it } from "vitest";
import { applyAction, createInitialState } from "../index.js";

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

  it("lets a non-active debtor sell assets during raise-cash", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.activePlayerIndex = 1;
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
});
