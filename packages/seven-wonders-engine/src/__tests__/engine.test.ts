import { describe, expect, it } from "vitest";
import {
  applyAction,
  createInitialState,
  getPublicStateForPlayer,
} from "../engine.js";
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

describe("createInitialState", () => {
  it("creates state for 3 players with distinct wonders", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());

    expect(state.phase).toBe("DRAFTING");
    expect(state.age).toBe(1);
    expect(state.turnOrder).toEqual(["p1", "p2", "p3"]);

    const wonderIds = new Set(
      Object.values(state.players).map((p) => p.wonderId),
    );
    expect(wonderIds.size).toBe(3);
  });

  it("deals 7 cards to each player", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());

    for (const pid of state.turnOrder) {
      expect(state.hands[pid].length).toBe(7);
    }
  });

  it("each player starts with 3 coins", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());

    for (const pid of state.turnOrder) {
      expect(state.players[pid].coins).toBe(3);
    }
  });

  it("throws for fewer than 3 players", () => {
    expect(() =>
      createInitialState("g1", THREE_PLAYERS.slice(0, 2), seededRng()),
    ).toThrow("Player count");
  });

  it("throws for more than 7 players", () => {
    const eight = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      token: `${i}`,
    }));
    expect(() => createInitialState("g1", eight, seededRng())).toThrow(
      "Player count",
    );
  });

  it("sets pass direction LEFT for age 1", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());
    expect(state.passDirection).toBe("LEFT");
  });
});

describe("applyAction - SUBMIT_PICK", () => {
  it("rejects pick for card not in hand", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());

    expect(() =>
      applyAction(state, {
        type: "SUBMIT_PICK",
        playerId: "p1",
        action: "PLAY",
        cardId: "nonexistent_card",
      }),
    ).toThrow("not in");
  });

  it("stores pending pick without resolving when not all submitted", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());
    const cardId = state.hands.p1[0];

    const { state: next } = applyAction(state, {
      type: "SUBMIT_PICK",
      playerId: "p1",
      action: "DISCARD",
      cardId,
    });

    expect(next.pendingPicks.p1).toBeDefined();
    expect(next.pendingPicks.p2).toBeUndefined();
  });

  it("discard gives +3 coins", () => {
    const rng = seededRng();
    let state = createInitialState("g1", THREE_PLAYERS, rng);

    const picks = state.turnOrder.map((pid) => ({
      type: "SUBMIT_PICK" as const,
      playerId: pid,
      action: "DISCARD" as const,
      cardId: state.hands[pid][0],
    }));

    for (const pick of picks) {
      const result = applyAction(state, pick, rng);
      state = result.state;
    }

    for (const pid of state.turnOrder) {
      expect(state.players[pid].coins).toBe(6);
    }
  });

  it("prevents duplicate pick from same player", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());
    const cardId = state.hands.p1[0];

    const { state: after1 } = applyAction(state, {
      type: "SUBMIT_PICK",
      playerId: "p1",
      action: "DISCARD",
      cardId,
    });

    expect(() =>
      applyAction(after1, {
        type: "SUBMIT_PICK",
        playerId: "p1",
        action: "DISCARD",
        cardId: after1.hands.p1[1],
      }),
    ).toThrow("already submitted");
  });
});

describe("pass direction", () => {
  it("hands rotate after all players pick", () => {
    const rng = seededRng();
    let state = createInitialState("g1", THREE_PLAYERS, rng);
    const originalP2Hand = [...state.hands.p2];

    const picks = state.turnOrder.map((pid) => ({
      type: "SUBMIT_PICK" as const,
      playerId: pid,
      action: "DISCARD" as const,
      cardId: state.hands[pid][0],
    }));

    for (const pick of picks) {
      const result = applyAction(state, pick, rng);
      state = result.state;
    }

    // NOTE: After discard, each hand loses 1 card. Age 1 passes LEFT.
    // In LEFT pass: p2's old hand (minus picked card) goes to p1.
    const remainingP2 = originalP2Hand.filter((id) => id !== picks[1].cardId);
    expect(state.hands.p1).toEqual(remainingP2);
  });
});

describe("free chain builds", () => {
  it("allows free play when prerequisite card is in tableau", () => {
    const rng = seededRng();
    const state = createInitialState("g1", THREE_PLAYERS, rng);

    // NOTE: Manually set up a chain scenario - put Altar in p1 tableau
    // then try to play Temple for free
    state.players.p1.tableau = ["altar_3p"];

    const templeId = "temple_3p";
    state.hands.p1 = [templeId, ...state.hands.p1.slice(1)];

    const otherPicks = ["p2", "p3"].map((pid) => ({
      type: "SUBMIT_PICK" as const,
      playerId: pid,
      action: "DISCARD" as const,
      cardId: state.hands[pid][0],
    }));

    const playTemple = {
      type: "SUBMIT_PICK" as const,
      playerId: "p1",
      action: "PLAY" as const,
      cardId: templeId,
    };

    let result = applyAction(state, playTemple, rng);
    for (const pick of otherPicks) {
      result = applyAction(result.state, pick, rng);
    }

    expect(result.state.players.p1.tableau).toContain(templeId);
    expect(result.state.players.p1.coins).toBe(3);
  });
});

describe("military tokens", () => {
  it("awards correct tokens after age 1 battles", () => {
    const rng = seededRng();
    let state = createInitialState("g1", THREE_PLAYERS, rng);

    // NOTE: Give p1 a military card to win battles
    state.players.p1.tableau = ["stockade_3p"];

    // NOTE: Simulate through all 6 turns to end age 1
    for (let turn = 0; turn < 6; turn++) {
      const picks = state.turnOrder.map((pid) => ({
        type: "SUBMIT_PICK" as const,
        playerId: pid,
        action: "DISCARD" as const,
        cardId: state.hands[pid][0],
      }));

      for (const pick of picks) {
        const result = applyAction(state, pick, rng);
        state = result.state;
      }

      if (state.phase === "GAME_OVER" || state.age !== 1) break;
    }

    // After age 1 military, p1 with 1 shield should beat neighbors with 0
    const p1Tokens = state.players.p1.militaryTokens;
    expect(p1Tokens.filter((t) => t === 1).length).toBe(2);
  });
});

describe("getPublicStateForPlayer", () => {
  it("hides other players hands", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());
    const publicState = getPublicStateForPlayer(state, "p1");

    expect(publicState.hands.p1.length).toBe(7);
    expect(publicState.hands.p2.length).toBe(0);
    expect(publicState.hands.p3.length).toBe(0);
  });

  it("shows own hand", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());
    const publicState = getPublicStateForPlayer(state, "p1");

    expect(publicState.hands.p1).toEqual(state.hands.p1);
  });
});
