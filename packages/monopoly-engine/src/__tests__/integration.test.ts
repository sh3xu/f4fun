import { describe, expect, it } from "vitest";
import { applyAction, createInitialState } from "../index.js";

function seededRng(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("integration", () => {
  it("completes a full turn: roll, land on unowned, buy, end turn", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    const rng = seededRng([0.2, 0.4]);

    expect(state.phase).toBe("PRE_ROLL");

    const roll = applyAction(state, { type: "ROLL_DICE" }, rng);
    expect(roll.error).toBeUndefined();
    expect(state.phase).toBe("BUY_OR_DECLINE");
    expect(state.players.p1.position).toBe(5);

    const buy = applyAction(state, { type: "BUY_PROPERTY" });
    expect(buy.error).toBeUndefined();
    expect(state.phase).toBe("END_TURN");
    expect(state.players.p1.ownedPositions).toContain(5);

    const end = applyAction(state, { type: "END_TURN" });
    expect(end.error).toBeUndefined();
    expect(state.phase).toBe("PRE_ROLL");
    expect(state.activePlayerIndex).toBe(1);
  });

  it("charges rent when landing on owned property", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.ownership[3] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(3);

    const rng = seededRng([0.1, 0.3]);

    const p1CashBefore = state.players.p1.cash;
    const p2CashBefore = state.players.p2.cash;

    const roll = applyAction(state, { type: "ROLL_DICE" }, rng);

    expect(roll.error).toBeUndefined();
    expect(state.players.p1.position).toBe(3);
    expect(state.players.p1.cash).toBeLessThan(p1CashBefore);
    expect(state.players.p2.cash).toBeGreaterThan(p2CashBefore);
    expect(state.phase).toBe("END_TURN");
  });

  it("sends player to jail on third double", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);

    const rng = seededRng([0.5, 0.5]);

    applyAction(state, { type: "ROLL_DICE" }, rng);
    expect(state.doublesCount).toBe(1);
    if (state.phase === "BUY_OR_DECLINE") {
      applyAction(state, { type: "DECLINE_PROPERTY" });
    }

    applyAction(state, { type: "ROLL_DICE" }, rng);
    expect(state.doublesCount).toBe(2);
    if (state.phase === "BUY_OR_DECLINE") {
      applyAction(state, { type: "DECLINE_PROPERTY" });
    }

    const thirdRoll = applyAction(state, { type: "ROLL_DICE" }, rng);
    expect(thirdRoll.error).toBeUndefined();
    expect(state.players.p1.position).toBe(10);
    expect(state.players.p1.isInJail).toBe(true);
    expect(state.doublesCount).toBe(0);
  });

  it("bankrupts player unable to pay rent", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.players.p1.cash = 10;
    state.ownership[39] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(39);

    state.players.p1.position = 35;

    const rng = seededRng([0.3, 0.3]);
    const roll = applyAction(state, { type: "ROLL_DICE" }, rng);

    expect(roll.error).toBeUndefined();
    expect(state.players.p1.isBankrupt).toBe(true);

    const winEvents = roll.events.filter((e) => e.type === "GAME_WON");
    expect(winEvents).toHaveLength(1);
    expect(state.phase).toBe("GAME_OVER");
  });
});
