import { describe, expect, it } from "vitest";
import { createInitialState } from "../index.js";
import { checkWinCondition, getWinner } from "../win.js";

describe("win", () => {
  it("declares winner when only one solvent player remains", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
      { id: "p3", name: "Carol", token: "dog" },
    ]);

    state.players.p2.isBankrupt = true;
    state.players.p3.isBankrupt = true;

    const events = checkWinCondition(state);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "GAME_WON", winnerId: "p1" });
    expect(state.phase).toBe("GAME_OVER");
    expect(state.winnerId).toBe("p1");
  });

  it("does not declare winner when multiple solvent players remain", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
      { id: "p3", name: "Carol", token: "dog" },
    ]);

    state.players.p3.isBankrupt = true;

    const events = checkWinCondition(state);

    expect(events).toHaveLength(0);
    expect(state.phase).not.toBe("GAME_OVER");
    expect(state.winnerId).toBeNull();
  });

  it("getWinner returns null when no winner", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);

    expect(getWinner(state)).toBeNull();
  });

  it("getWinner returns winner id when game is over", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    state.winnerId = "p1";
    state.phase = "GAME_OVER";

    expect(getWinner(state)).toBe("p1");
  });
});
