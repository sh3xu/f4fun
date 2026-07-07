import { describe, expect, it } from "vitest";
import { createInitialState } from "../index.js";
import { calculateRent, chargeRent, ownsColorGroup } from "../rent.js";

describe("rent", () => {
  it("calculates base rent for property without monopoly", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.ownership[1] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(1);

    const rent = calculateRent(state, 1);
    expect(rent).toBe(2);
  });

  it("doubles rent when monopoly is owned", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.ownership[1] = { ownerId: "p2", isMortgaged: false };
    state.ownership[3] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(1, 3);

    const rent = calculateRent(state, 1);
    expect(rent).toBe(4);
  });

  it("returns zero rent for mortgaged property", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.ownership[1] = { ownerId: "p2", isMortgaged: true };
    state.players.p2.ownedPositions.push(1);

    const rent = calculateRent(state, 1);
    expect(rent).toBe(0);
  });

  it("calculates railroad rent based on number owned", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.ownership[5] = { ownerId: "p2", isMortgaged: false };
    state.ownership[15] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(5, 15);

    const rent = calculateRent(state, 5);
    expect(rent).toBe(50);
  });

  it("calculates utility rent with dice multiplier", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.ownership[12] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(12);

    const rent = calculateRent(state, 12, 7);
    expect(rent).toBe(28);
  });

  it("charges rent and transfers cash", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.ownership[1] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(1);

    const p1Cash = state.players.p1.cash;
    const p2Cash = state.players.p2.cash;

    const events = chargeRent(state, "p1", "p2", 1);

    expect(state.players.p1.cash).toBe(p1Cash - 2);
    expect(state.players.p2.cash).toBe(p2Cash + 2);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("RENT_PAID");
  });

  it("detects color group monopoly", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);

    state.players.p1.ownedPositions.push(1, 3);

    expect(ownsColorGroup(state, "p1", "brown")).toBe(true);
    expect(ownsColorGroup(state, "p1", "light_blue")).toBe(false);
  });
});
