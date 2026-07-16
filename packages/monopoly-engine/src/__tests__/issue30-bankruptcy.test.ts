import { describe, expect, it } from "vitest";
import { applyAction, createInitialState } from "../index.js";

function seededRng(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("issue #30 bankruptcy and win", () => {
  it("enters raise-cash phase when rent exceeds cash", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.players.p1.cash = 10;
    state.players.p1.ownedPositions = [1, 3];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };
    state.ownership[39] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(39);
    state.players.p1.position = 35;

    const roll = applyAction(
      state,
      { type: "ROLL_DICE" },
      seededRng([0.3, 0.3]),
    );

    expect(roll.error).toBeUndefined();
    expect(state.players.p1.isBankrupt).toBe(false);
    expect(state.phase).toBe("RAISE_CASH");
    expect(roll.events.some((e) => e.type === "DEBT_RAISED")).toBe(true);
    expect(roll.events.some((e) => e.type === "GAME_WON")).toBe(false);
  });

  it("does not end a three-player game when one player bankrupts", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
      { id: "p3", name: "Carol", token: "dog" },
    ]);

    state.players.p1.cash = 10;
    state.ownership[39] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(39);
    state.players.p1.position = 35;

    const roll = applyAction(
      state,
      { type: "ROLL_DICE" },
      seededRng([0.3, 0.3]),
    );

    expect(roll.error).toBeUndefined();
    expect(state.players.p1.isBankrupt).toBe(false);
    expect(state.players.p2.isBankrupt).toBe(false);
    expect(state.players.p3.isBankrupt).toBe(false);
    expect(roll.events.filter((e) => e.type === "GAME_WON")).toHaveLength(0);
    expect(state.winnerId).toBeNull();
    expect(state.phase).toBe("RAISE_CASH");
  });

  it("declares winner after force-settle when only one solvent player remains", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.players.p1.cash = 10;
    state.ownership[39] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(39);
    state.players.p1.position = 35;

    const roll = applyAction(
      state,
      { type: "ROLL_DICE" },
      seededRng([0.3, 0.3]),
    );

    expect(roll.error).toBeUndefined();
    expect(state.players.p1.isBankrupt).toBe(false);
    expect(roll.events.filter((e) => e.type === "GAME_WON")).toHaveLength(0);

    const settle = applyAction(
      state,
      { type: "FORCE_SETTLE_DEBT" },
      Math.random,
      "p1",
    );
    expect(settle.error).toBeUndefined();
    expect(state.players.p1.isBankrupt).toBe(true);
    expect(settle.events.filter((e) => e.type === "GAME_WON")).toHaveLength(1);
    expect(state.winnerId).toBe("p2");
  });
});
