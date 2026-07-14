import { describe, expect, it } from "vitest";
import { applyAction, createInitialState, HOUSE_SELL_RATE } from "../index.js";

describe("building", () => {
  function monopolyBrown() {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    state.phase = "END_TURN";
    state.players.p1.ownedPositions = [1, 3];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };
    return state;
  }

  it("builds houses evenly and sells at 75%", () => {
    const state = monopolyBrown();
    const cost = 50; // brown houseCost

    applyAction(state, { type: "BUILD_HOUSE", position: 1 });
    applyAction(state, { type: "BUILD_HOUSE", position: 3 });
    expect(state.players.p1.houses[1]).toBe(1);
    expect(state.players.p1.houses[3]).toBe(1);

    const cashBefore = state.players.p1.cash;
    const sell = applyAction(state, { type: "SELL_HOUSE", position: 1 });
    expect(sell.error).toBeUndefined();
    expect(state.players.p1.cash).toBe(
      cashBefore + Math.floor(cost * HOUSE_SELL_RATE),
    );
  });

  it("rejects uneven building", () => {
    const state = monopolyBrown();
    applyAction(state, { type: "BUILD_HOUSE", position: 1 });
    const result = applyAction(state, { type: "BUILD_HOUSE", position: 1 });
    expect(result.error).toBe("Must build evenly across the color group");
  });
});

describe("mortgage", () => {
  it("mortgages and unmortgages with 10% interest", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    state.phase = "END_TURN";
    state.players.p1.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };

    const mort = applyAction(state, { type: "MORTGAGE_PROPERTY", position: 1 });
    expect(mort.error).toBeUndefined();
    expect(state.ownership[1]?.isMortgaged).toBe(true);
    expect(state.players.p1.mortgaged).toContain(1);
    expect(state.players.p1.cash).toBe(1500 + 30);

    const unmort = applyAction(state, {
      type: "UNMORTGAGE_PROPERTY",
      position: 1,
    });
    expect(unmort.error).toBeUndefined();
    expect(state.ownership[1]?.isMortgaged).toBe(false);
    expect(state.players.p1.cash).toBe(1500 + 30 - Math.ceil(30 * 1.1));
  });
});
