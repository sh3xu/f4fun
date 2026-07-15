import { describe, expect, it } from "vitest";
import {
  applyAction,
  createInitialState,
  expiredTradeIds,
  proposeTrade,
} from "../index.js";

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
    expect(state.pendingTrades[0]?.expiresAt).toBeTruthy();

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

  it("stamps expiresAt from tradeTimeoutSecs", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const result = proposeTrade(
      state,
      "p1",
      "t-exp",
      "p2",
      { cash: 10, positions: [], goojfCards: 0 },
      { cash: 0, positions: [], goojfCards: 0 },
      now,
    );
    expect(result.error).toBeUndefined();
    expect(state.pendingTrades[0]?.expiresAt).toBe("2026-01-01T00:01:00.000Z");
    expect(expiredTradeIds(state, now)).toEqual([]);
    expect(expiredTradeIds(state, now + 60_000)).toEqual(["t-exp"]);
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

  it("rejects a second pending trade and off-turn propose", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    applyAction(
      state,
      {
        type: "PROPOSE_TRADE",
        tradeId: "t-a",
        toPlayerId: "p2",
        offer: { cash: 10, positions: [], goojfCards: 0 },
        request: { cash: 0, positions: [], goojfCards: 0 },
      },
      Math.random,
      "p1",
    );

    const second = applyAction(
      state,
      {
        type: "PROPOSE_TRADE",
        tradeId: "t-b",
        toPlayerId: "p2",
        offer: { cash: 5, positions: [], goojfCards: 0 },
        request: { cash: 0, positions: [], goojfCards: 0 },
      },
      Math.random,
      "p1",
    );
    expect(second.error).toBe("Resolve pending trade first");

    const offTurn = applyAction(
      createInitialState("test2", [
        { id: "p1", name: "Alice", token: "car" },
        { id: "p2", name: "Bob", token: "hat" },
      ]),
      {
        type: "PROPOSE_TRADE",
        tradeId: "t-c",
        toPlayerId: "p1",
        offer: { cash: 5, positions: [], goojfCards: 0 },
        request: { cash: 0, positions: [], goojfCards: 0 },
      },
      Math.random,
      "p2",
    );
    expect(offTurn.error).toBe("Not your turn");
  });

  it("blocks roll while a trade is pending", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    applyAction(
      state,
      {
        type: "PROPOSE_TRADE",
        tradeId: "t-block",
        toPlayerId: "p2",
        offer: { cash: 1, positions: [], goojfCards: 0 },
        request: { cash: 0, positions: [], goojfCards: 0 },
      },
      Math.random,
      "p1",
    );
    const roll = applyAction(state, { type: "ROLL_DICE" }, Math.random, "p1");
    expect(roll.error).toBe("Resolve pending trade first");
  });
});
