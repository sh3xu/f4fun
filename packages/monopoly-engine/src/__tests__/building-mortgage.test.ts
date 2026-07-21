import { describe, expect, it } from "vitest";
import {
  applyAction,
  COLOR_GROUP_BUILDINGS_CLEAR_ERROR,
  createInitialState,
  HOUSE_SELL_RATE,
} from "../index.js";

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

  it("rejects uneven house sell", () => {
    const state = monopolyBrown();
    applyAction(state, { type: "BUILD_HOUSE", position: 1 });
    applyAction(state, { type: "BUILD_HOUSE", position: 3 });
    applyAction(state, { type: "BUILD_HOUSE", position: 1 });
    // Counts are 2-1; selling from the lower tile breaks evenness.
    const result = applyAction(state, { type: "SELL_HOUSE", position: 3 });
    expect(result.error).toBe("Must sell evenly across the color group");
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

  it("blocks mortgage when any monopoly color-group tile has buildings", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    state.phase = "END_TURN";
    // Dark blue: Park Place (37) and Boardwalk (39)
    state.players.p1.ownedPositions = [37, 39];
    state.ownership[37] = { ownerId: "p1", isMortgaged: false };
    state.ownership[39] = { ownerId: "p1", isMortgaged: false };
    state.players.p1.houses[39] = 4;

    const result = applyAction(state, {
      type: "MORTGAGE_PROPERTY",
      position: 37,
    });
    expect(result.error).toBe(COLOR_GROUP_BUILDINGS_CLEAR_ERROR);
    expect(state.ownership[37]?.isMortgaged).toBe(false);
  });

  it("blocks mortgage when the target tile itself has buildings", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    state.phase = "END_TURN";
    state.players.p1.ownedPositions = [1, 3];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };
    state.players.p1.houses[1] = 1;

    const result = applyAction(state, {
      type: "MORTGAGE_PROPERTY",
      position: 1,
    });
    expect(result.error).toBe(COLOR_GROUP_BUILDINGS_CLEAR_ERROR);
    expect(state.ownership[1]?.isMortgaged).toBe(false);
  });
});
