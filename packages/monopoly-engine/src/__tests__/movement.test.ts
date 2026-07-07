import { describe, expect, it } from "vitest";
import { createInitialState } from "../index.js";
import { applyMove, movePlayer, setPlayerPosition } from "../movement.js";

describe("movement", () => {
  it("moves player forward and detects passing GO", () => {
    const result = movePlayer(35, 8);
    expect(result.newPosition).toBe(3);
    expect(result.passedGo).toBe(true);
  });

  it("moves without passing GO", () => {
    const result = movePlayer(5, 10);
    expect(result.newPosition).toBe(15);
    expect(result.passedGo).toBe(false);
  });

  it("landing exactly on GO does not count as passing", () => {
    const result = movePlayer(35, 5);
    expect(result.newPosition).toBe(0);
    expect(result.passedGo).toBe(true);
  });

  it("awards $200 for passing GO", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    const initialCash = player.cash;

    player.position = 38;
    const events = applyMove(state, "p1", 5);

    expect(player.position).toBe(3);
    expect(player.cash).toBe(initialCash + 200);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("PASSED_GO");
  });

  it("setPlayerPosition awards GO salary when moving backward past GO", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    player.position = 30;
    const initialCash = player.cash;

    const events = setPlayerPosition(state, "p1", 5, true);

    expect(player.position).toBe(5);
    expect(player.cash).toBe(initialCash + 200);
    expect(events).toHaveLength(1);
  });

  it("setPlayerPosition does not award GO when collectGoIfPassed is false", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    player.position = 30;
    const initialCash = player.cash;

    const events = setPlayerPosition(state, "p1", 10, false);

    expect(player.position).toBe(10);
    expect(player.cash).toBe(initialCash);
    expect(events).toHaveLength(0);
  });
});
