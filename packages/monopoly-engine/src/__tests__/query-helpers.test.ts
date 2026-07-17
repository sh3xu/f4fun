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
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };
    state.players.p1.ownedPositions = [1, 3];

    const partial = evaluateBoardState(state, "p1");
    state.ownership[6] = { ownerId: "p1", isMortgaged: false };
    state.players.p1.ownedPositions = [1, 3, 6];
    const complete = evaluateBoardState(state, "p1");

    expect(complete.monopolyCount).toBe(1);
    expect(complete.score).toBeGreaterThan(partial.score);
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
