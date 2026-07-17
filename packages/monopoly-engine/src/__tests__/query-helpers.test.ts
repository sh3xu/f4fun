import { describe, expect, it } from "vitest";
import {
  cloneState,
  createInitialState,
  evaluateBoardState,
  getLegalActions,
  simulateAction,
} from "../index.js";

describe("simulateAction", () => {
  it("does not mutate the original state", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "memo_1" },
    ]);
    const cashBefore = state.players.p1.cash;
    const phaseBefore = state.phase;

    simulateAction(state, { type: "ROLL_DICE" }, () => 0.1);

    expect(state.players.p1.cash).toBe(cashBefore);
    expect(state.phase).toBe(phaseBefore);
  });
});

describe("getLegalActions", () => {
  it("returns ROLL_DICE in PRE_ROLL for active player", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "memo_1" },
    ]);
    const actions = getLegalActions(state, "p1");
    expect(actions.some((a) => a.type === "ROLL_DICE")).toBe(true);
  });

  it("every returned action passes simulateAction", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "memo_1" },
      { id: "p2", name: "Bob", token: "memo_2" },
    ]);

    for (const actorId of ["p1", "p2"]) {
      const actions = getLegalActions(state, actorId);
      for (const action of actions) {
        const result = simulateAction(state, action, () => 0.5, actorId);
        expect(result.error).toBeUndefined();
      }
    }
  });

  it("returns buy and decline in BUY_OR_DECLINE", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "memo_1" },
    ]);
    state.phase = "BUY_OR_DECLINE";
    state.players.p1.position = 1;

    const actions = getLegalActions(state, "p1");
    expect(actions.some((a) => a.type === "BUY_PROPERTY")).toBe(true);
    expect(actions.some((a) => a.type === "DECLINE_PROPERTY")).toBe(true);
  });

  it("lets the trade sender discover rejection only", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "memo_1" },
      { id: "p2", name: "Bob", token: "memo_2" },
    ]);
    state.pendingTrades.push({
      tradeId: "t1",
      fromPlayerId: "p1",
      toPlayerId: "p2",
      offer: { cash: 10, positions: [], goojfCards: 0 },
      request: { cash: 0, positions: [], goojfCards: 0 },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const senderActions = getLegalActions(state, "p1");
    expect(
      senderActions.some(
        (action) => action.type === "REJECT_TRADE" && action.tradeId === "t1",
      ),
    ).toBe(true);
    expect(senderActions.some((action) => action.type === "ACCEPT_TRADE")).toBe(
      false,
    );
  });

  it("lets an off-turn debtor manage assets in raise-cash", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "memo_1" },
      { id: "p2", name: "Bob", token: "memo_2" },
    ]);
    state.activePlayerIndex = 1;
    state.phase = "RAISE_CASH";
    state.pendingDebt = { playerId: "p1", creditorId: "p2" };
    state.players.p1.cash = -20;
    state.players.p1.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };

    const actions = getLegalActions(state, "p1");
    const sellToBank = actions.find(
      (action) =>
        action.type === "SELL_PROPERTY_TO_BANK" && action.position === 1,
    );

    expect(sellToBank).toBeTruthy();
    if (!sellToBank) {
      throw new Error("expected SELL_PROPERTY_TO_BANK action");
    }
    expect(simulateAction(state, sellToBank, () => 0.5, "p1").error).toBe(
      undefined,
    );
  });
});

describe("evaluateBoardState", () => {
  it("scores higher with more cash", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "memo_1" },
    ]);
    const low = evaluateBoardState(state, "p1");
    state.players.p1.cash += 500;
    const high = evaluateBoardState(state, "p1");
    expect(high.netWorth).toBeGreaterThan(low.netWorth);
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("rewards completed monopolies", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "memo_1" },
    ]);
    state.ownership[6] = { ownerId: "p1", isMortgaged: false };
    state.ownership[8] = { ownerId: "p1", isMortgaged: false };
    state.players.p1.ownedPositions = [6, 8];

    const partial = evaluateBoardState(state, "p1");
    state.ownership[9] = { ownerId: "p1", isMortgaged: false };
    state.players.p1.ownedPositions = [6, 8, 9];
    const complete = evaluateBoardState(state, "p1");

    expect(partial.monopolyCount).toBe(0);
    expect(complete.monopolyCount).toBe(1);
    expect(complete.score).toBeGreaterThan(partial.score);
  });

  it("includes full hotel value in net worth", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "memo_1" },
    ]);
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.players.p1.ownedPositions = [1];
    state.players.p1.houses[1] = 2;
    state.players.p1.hotels[1] = 1;

    const evaluation = evaluateBoardState(state, "p1");

    expect(evaluation.propertyValue).toBe(60);
    expect(evaluation.buildingValue).toBe(350);
    expect(evaluation.netWorth).toBe(1910);
  });
});

describe("cloneState", () => {
  it("produces independent copy", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "memo_1" },
    ]);
    const copy = cloneState(state);
    copy.players.p1.cash = 0;
    expect(state.players.p1.cash).toBe(1500);
  });
});
