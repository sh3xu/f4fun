import { describe, expect, it } from "vitest";
import { createInitialState } from "../engine.js";
import { canAfford, getPlayerProduction } from "../resources.js";
import type { PlayerConfig, RNG } from "../types.js";

function seededRng(seed = 42): RNG {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const THREE_PLAYERS: PlayerConfig[] = [
  { id: "p1", name: "Alice", token: "A" },
  { id: "p2", name: "Bob", token: "B" },
  { id: "p3", name: "Charlie", token: "C" },
];

describe("neighbor choice resource trading", () => {
  it("stores brown choice cards as a single alternative group", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());
    state.players.p2.tableau = ["clay_pit_3p"];

    const prod = getPlayerProduction(state.players.p2);
    expect(prod.choices).toContainEqual(["clay", "ore"]);
    expect(prod.fixed.clay ?? 0).toBe(0);
    expect(prod.fixed.ore ?? 0).toBe(0);
  });

  it("allows buying clay from a neighbor Clay Pit choice producer", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());

    // p1 needs clay; p2 (right neighbor of p1 when order is p1,p2,p3 — right is +1) has Clay Pit.
    // getNeighborIds: left = idx-1, right = idx+1. For p1: left=p3, right=p2.
    state.players.p1.wonderId = "rhodes"; // ore
    state.players.p1.tableau = [];
    state.players.p1.coins = 2;
    state.players.p2.wonderId = "giza"; // stone
    state.players.p2.tableau = ["clay_pit_3p"];
    state.players.p3.tableau = [];

    const trade = canAfford(state, "p1", { clay: 1 }, 0);
    expect(trade).not.toBeNull();
    expect(trade?.rightCost).toBe(2);
    expect(trade?.totalCoinCost).toBe(2);
  });

  it("allows buying ore from the same Clay Pit instead of clay", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());

    state.players.p1.wonderId = "rhodes";
    state.players.p1.tableau = [];
    state.players.p1.coins = 2;
    state.players.p2.tableau = ["clay_pit_3p"];
    state.players.p3.tableau = [];

    const trade = canAfford(state, "p1", { ore: 1 }, 0);
    // Own wonder already produces ore — no trade needed.
    expect(trade).toEqual({ totalCoinCost: 0, leftCost: 0, rightCost: 0 });
  });

  it("buys ore from neighbor Clay Pit when self has no ore", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());

    state.players.p1.wonderId = "giza"; // stone
    state.players.p1.tableau = [];
    state.players.p1.coins = 2;
    state.players.p2.tableau = ["clay_pit_3p"];
    state.players.p3.tableau = [];

    const trade = canAfford(state, "p1", { ore: 1 }, 0);
    expect(trade).not.toBeNull();
    expect(trade?.rightCost).toBe(2);
  });

  it("does not sell both clay and ore from one Clay Pit", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());

    state.players.p1.wonderId = "giza";
    state.players.p1.tableau = [];
    state.players.p1.coins = 10;
    state.players.p2.tableau = ["clay_pit_3p"];
    state.players.p3.tableau = [];

    const trade = canAfford(state, "p1", { clay: 1, ore: 1 }, 0);
    expect(trade).toBeNull();
  });
});
