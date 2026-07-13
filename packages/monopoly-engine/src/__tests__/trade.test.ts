import { describe, expect, it } from "vitest";
import { applyAction, createInitialState } from "../index.js";

describe("trade", () => {
  it("proposes and accepts a property for cash trade", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.players.p1.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };

    const propose = applyAction(
      state,
      {
        type: "PROPOSE_TRADE",
        tradeId: "t1",
        toPlayerId: "p2",
        offer: { cash: 0, positions: [1], goojfCards: 0 },
        request: { cash: 100, positions: [], goojfCards: 0 },
      },
      Math.random,
      "p1",
    );
    expect(propose.error).toBeUndefined();
    expect(state.pendingTrades).toHaveLength(1);

    const accept = applyAction(
      state,
      { type: "ACCEPT_TRADE", tradeId: "t1" },
      Math.random,
      "p2",
    );
    expect(accept.error).toBeUndefined();
    expect(state.ownership[1]?.ownerId).toBe("p2");
    expect(state.players.p1.cash).toBe(1600);
    expect(state.players.p2.cash).toBe(1400);
    expect(state.pendingTrades).toHaveLength(0);
  });

  it("transfers mortgaged property via trade", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.players.p1.ownedPositions = [1];
    state.players.p1.mortgaged = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: true };

    applyAction(
      state,
      {
        type: "PROPOSE_TRADE",
        tradeId: "t2",
        toPlayerId: "p2",
        offer: { cash: 0, positions: [1], goojfCards: 0 },
        request: { cash: 0, positions: [], goojfCards: 0 },
      },
      Math.random,
      "p1",
    );
    applyAction(
      state,
      { type: "ACCEPT_TRADE", tradeId: "t2" },
      Math.random,
      "p2",
    );

    expect(state.ownership[1]).toEqual({ ownerId: "p2", isMortgaged: true });
    expect(state.players.p2.mortgaged).toContain(1);
  });

  it("rejects trade", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    applyAction(
      state,
      {
        type: "PROPOSE_TRADE",
        tradeId: "t3",
        toPlayerId: "p2",
        offer: { cash: 50, positions: [], goojfCards: 0 },
        request: { cash: 0, positions: [], goojfCards: 0 },
      },
      Math.random,
      "p1",
    );
    const result = applyAction(
      state,
      { type: "REJECT_TRADE", tradeId: "t3" },
      Math.random,
      "p2",
    );
    expect(result.events.some((e) => e.type === "TRADE_REJECTED")).toBe(true);
    expect(state.pendingTrades).toHaveLength(0);
  });
});
