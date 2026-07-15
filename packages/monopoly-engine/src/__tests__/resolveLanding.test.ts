import { describe, expect, it } from "vitest";
import { applyAction, createInitialState } from "../index.js";

function seededRng(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("resolveLanding bankruptcy and doubles", () => {
  it("ends turn on doubles tax bankruptcy when other players remain", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
      { id: "p3", name: "Carol", token: "dog" },
    ]);

    // From GO, doubles 2+2 → Income Tax (4)
    state.players.p1.cash = 100;
    const rng = seededRng([0.2, 0.2]);
    const result = applyAction(state, { type: "ROLL_DICE" }, rng);

    expect(result.error).toBeUndefined();
    expect(state.players.p1.position).toBe(4);
    expect(state.players.p1.isBankrupt).toBe(true);
    expect(state.phase).toBe("END_TURN");
    expect(state.phase).not.toBe("PRE_ROLL");
    expect(
      result.events.filter((e) => e.type === "PLAYER_BANKRUPT"),
    ).toHaveLength(1);
  });

  it("still grants PRE_ROLL after buying on normal doubles", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    // From GO, doubles 1+1 → Community Chest (2) is a card; use 3+3 from Mediterranean path.
    // Position 0, roll 3+3 → 6 (Oriental Avenue), unowned
    const rng = seededRng([0.4, 0.4]);
    const roll = applyAction(state, { type: "ROLL_DICE" }, rng);
    expect(roll.error).toBeUndefined();
    expect(state.phase).toBe("BUY_OR_DECLINE");
    expect(state.allowDoublesReroll).toBe(true);

    const buy = applyAction(state, { type: "BUY_PROPERTY" });
    expect(buy.error).toBeUndefined();
    expect(state.phase).toBe("PRE_ROLL");
  });
});
