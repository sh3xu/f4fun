import { describe, expect, it } from "vitest";
import {
  applyAction,
  createInitialState,
  getPublicStateForPlayer,
  getWonderById,
  validatePick,
} from "../index.js";
import { resolveWinnerId } from "../scoring.js";
import type { GameState, PlayerConfig, RNG, ScoreBreakdown } from "../types.js";

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

function emptyScore(overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  return {
    military: 0,
    coins: 0,
    wonder: 0,
    civilian: 0,
    science: 0,
    commerce: 0,
    guild: 0,
    total: 0,
    ...overrides,
  };
}

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

describe("validatePick - affordability before all picks are in", () => {
  it("rejects unaffordable PLAY without storing a pending pick", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());
    // Palace needs all seven resource types — impossible with starting production only.
    const cardId = "palace_3p";
    state.hands.p1 = [cardId, ...state.hands.p1.slice(1)];
    state.players.p1.coins = 0;

    expect(() => validatePick(state, "p1", "PLAY", cardId)).toThrow(
      "cannot afford",
    );

    expect(() =>
      applyAction(state, {
        type: "SUBMIT_PICK",
        playerId: "p1",
        action: "PLAY",
        cardId,
      }),
    ).toThrow("cannot afford");

    expect(state.pendingPicks.p1).toBeUndefined();
  });

  it("rejects unaffordable STAGE_WONDER before other players submit", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());
    const cardId = state.hands.p1[0];
    // Strip production and coins so the first wonder stage cannot be paid.
    state.players.p1.coins = 0;
    state.players.p1.tableau = [];
    // Force a wonder whose stage needs resources the player cannot produce/trade for.
    state.players.p1.wonderId = "giza";
    state.players.p2.tableau = [];
    state.players.p3.tableau = [];

    expect(() => validatePick(state, "p1", "STAGE_WONDER", cardId)).toThrow(
      "cannot afford wonder stage",
    );

    expect(() =>
      applyAction(state, {
        type: "SUBMIT_PICK",
        playerId: "p1",
        action: "STAGE_WONDER",
        cardId,
      }),
    ).toThrow("cannot afford wonder stage");

    expect(state.pendingPicks.p1).toBeUndefined();
  });

  it("rejects STAGE_WONDER when all stages are already built", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());
    const cardId = state.hands.p1[0];
    const wonder = getWonderById(state.players.p1.wonderId);
    state.players.p1.wonderStagesBuilt = wonder.stages.length;

    expect(() =>
      applyAction(state, {
        type: "SUBMIT_PICK",
        playerId: "p1",
        action: "STAGE_WONDER",
        cardId,
      }),
    ).toThrow("already built all wonder stages");

    expect(state.pendingPicks.p1).toBeUndefined();
  });

  it("rejects PLAY of a duplicate card name already in tableau", () => {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());
    state.players.p1.tableau = ["altar_3p"];
    state.hands.p1 = ["altar_5p", ...state.hands.p1.slice(1)];

    expect(() =>
      applyAction(state, {
        type: "SUBMIT_PICK",
        playerId: "p1",
        action: "PLAY",
        cardId: "altar_5p",
      }),
    ).toThrow("already has Altar");

    expect(state.pendingPicks.p1).toBeUndefined();
  });
});

describe("resolveWinnerId", () => {
  function gameWithCoins(coins: Record<string, number>): GameState {
    const state = createInitialState("g1", THREE_PLAYERS, seededRng());
    for (const [id, amount] of Object.entries(coins)) {
      state.players[id].coins = amount;
    }
    state.phase = "GAME_OVER";
    return state;
  }

  it("picks sole highest total", () => {
    const state = gameWithCoins({ p1: 5, p2: 5, p3: 5 });
    const scores = {
      p1: emptyScore({ total: 40 }),
      p2: emptyScore({ total: 30 }),
      p3: emptyScore({ total: 20 }),
    };
    expect(resolveWinnerId(state, scores)).toBe("p1");
  });

  it("breaks VP ties with treasury coins", () => {
    const state = gameWithCoins({ p1: 4, p2: 12, p3: 2 });
    const scores = {
      p1: emptyScore({ total: 35 }),
      p2: emptyScore({ total: 35 }),
      p3: emptyScore({ total: 10 }),
    };
    expect(resolveWinnerId(state, scores)).toBe("p2");
  });

  it("returns null when VP and coins still tie", () => {
    const state = gameWithCoins({ p1: 9, p2: 9, p3: 1 });
    const scores = {
      p1: emptyScore({ total: 35 }),
      p2: emptyScore({ total: 35 }),
      p3: emptyScore({ total: 10 }),
    };
    expect(resolveWinnerId(state, scores)).toBeNull();
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

describe("simultaneous resolution", () => {
  it("rejects plays that only become affordable via a neighbor card played this turn", () => {
    const rng = seededRng();
    const state = createInitialState("g1", THREE_PLAYERS, rng);

    // p1 will play wood this turn; p2 has no wood and cannot buy it yet.
    state.players.p1.wonderId = "rhodes"; // starts with ore
    state.players.p1.tableau = [];
    state.players.p2.wonderId = "rhodes";
    state.players.p2.tableau = [];
    state.players.p2.coins = 2;
    state.players.p3.tableau = [];

    state.hands.p1 = ["lumber_yard_4p", ...state.hands.p1.slice(1)];
    // Baths costs stone; use timber_yard chain... actually use a card that costs wood.
    // Stockade costs wood.
    state.hands.p2 = ["stockade_3p", ...state.hands.p2.slice(1)];

    expect(() =>
      applyAction(state, {
        type: "SUBMIT_PICK",
        playerId: "p2",
        action: "PLAY",
        cardId: "stockade_3p",
      }),
    ).toThrow("cannot afford");
  });

  it("counts coinsFromCards against post-build tableaus regardless of turn order", () => {
    const rng = seededRng();
    let state = createInitialState("g1", THREE_PLAYERS, rng);

    // Vineyard on p1 (resolves first); brown card on p2 (neighbor) same turn.
    state.players.p1.tableau = [];
    state.players.p1.coins = 3;
    state.players.p2.tableau = [];
    state.players.p3.tableau = [];

    state.hands.p1 = ["vineyard_3p", ...state.hands.p1.slice(1)];
    state.hands.p2 = ["lumber_yard_4p", ...state.hands.p2.slice(1)];

    const picks = [
      {
        type: "SUBMIT_PICK" as const,
        playerId: "p1",
        action: "PLAY" as const,
        cardId: "vineyard_3p",
      },
      {
        type: "SUBMIT_PICK" as const,
        playerId: "p2",
        action: "PLAY" as const,
        cardId: "lumber_yard_4p",
      },
      {
        type: "SUBMIT_PICK" as const,
        playerId: "p3",
        action: "DISCARD" as const,
        cardId: state.hands.p3[0],
      },
    ];

    for (const pick of picks) {
      state = applyAction(state, pick, rng).state;
    }

    // Vineyard: 1 coin per brown on self + neighbors. p2's new lumber yard counts.
    expect(state.players.p1.tableau).toContain("vineyard_3p");
    expect(state.players.p2.tableau).toContain("lumber_yard_4p");
    expect(state.players.p1.coins).toBe(4);
  });
});

describe("wonder special abilities", () => {
  it("grants pending freeBuild when Olympia stage 2 is built", () => {
    const rng = seededRng();
    let state = createInitialState("g1", THREE_PLAYERS, rng);

    state.players.p1.wonderId = "olympia";
    state.players.p1.wonderStagesBuilt = 1;
    state.players.p1.tableau = ["stone_pit_3p", "stone_pit_5p"];
    state.players.p1.coins = 3;

    const cardId = state.hands.p1[0];
    const picks = [
      {
        type: "SUBMIT_PICK" as const,
        playerId: "p1",
        action: "STAGE_WONDER" as const,
        cardId,
      },
      {
        type: "SUBMIT_PICK" as const,
        playerId: "p2",
        action: "DISCARD" as const,
        cardId: state.hands.p2[0],
      },
      {
        type: "SUBMIT_PICK" as const,
        playerId: "p3",
        action: "DISCARD" as const,
        cardId: state.hands.p3[0],
      },
    ];

    for (const pick of picks) {
      state = applyAction(state, pick, rng).state;
    }

    expect(state.players.p1.wonderStagesBuilt).toBe(2);
    expect(state.players.p1.pendingAbility).toEqual({ type: "freeBuild" });
  });

  it("allows PLAY with useFreeBuild to skip resource cost", () => {
    const rng = seededRng();
    let state = createInitialState("g1", THREE_PLAYERS, rng);

    state.players.p1.wonderId = "olympia";
    state.players.p1.wonderStagesBuilt = 2;
    state.players.p1.pendingAbility = { type: "freeBuild" };
    state.players.p1.tableau = [];
    state.players.p1.coins = 0;
    state.players.p2.tableau = [];
    state.players.p3.tableau = [];

    // Palace is unaffordable without freeBuild.
    state.hands.p1 = ["palace_3p", ...state.hands.p1.slice(1)];

    const picks = [
      {
        type: "SUBMIT_PICK" as const,
        playerId: "p1",
        action: "PLAY" as const,
        cardId: "palace_3p",
        useFreeBuild: true,
      },
      {
        type: "SUBMIT_PICK" as const,
        playerId: "p2",
        action: "DISCARD" as const,
        cardId: state.hands.p2[0],
      },
      {
        type: "SUBMIT_PICK" as const,
        playerId: "p3",
        action: "DISCARD" as const,
        cardId: state.hands.p3[0],
      },
    ];

    for (const pick of picks) {
      state = applyAction(state, pick, rng).state;
    }

    expect(state.players.p1.tableau).toContain("palace_3p");
    expect(state.players.p1.pendingAbility).toBeNull();
    expect(state.players.p1.coins).toBe(0);
  });

  it("enters RESOLVING_ABILITY for Halicarnassus playDiscarded and plays from discard", () => {
    const rng = seededRng();
    let state = createInitialState("g1", THREE_PLAYERS, rng);

    state.players.p1.wonderId = "halicarnassus";
    state.players.p1.wonderStagesBuilt = 1;
    // Stage 2 costs 3 ore; two Ore Veins + Forest Cave (wood/ore) covers it.
    state.players.p1.tableau = ["ore_vein_3p", "ore_vein_4p", "forest_cave_5p"];
    state.players.p1.coins = 0;
    state.discardPile = ["baths_3p"];

    const stageCard = state.hands.p1[0];

    let result = applyAction(
      state,
      {
        type: "SUBMIT_PICK",
        playerId: "p1",
        action: "STAGE_WONDER",
        cardId: stageCard,
      },
      rng,
    );
    result = applyAction(
      result.state,
      {
        type: "SUBMIT_PICK",
        playerId: "p2",
        action: "DISCARD",
        cardId: result.state.hands.p2[0],
      },
      rng,
    );
    result = applyAction(
      result.state,
      {
        type: "SUBMIT_PICK",
        playerId: "p3",
        action: "DISCARD",
        cardId: result.state.hands.p3[0],
      },
      rng,
    );

    state = result.state;
    expect(state.phase).toBe("RESOLVING_ABILITY");
    expect(state.players.p1.pendingAbility).toEqual({ type: "playDiscarded" });
    expect(state.players.p1.wonderStagesBuilt).toBe(2);

    const after = applyAction(
      state,
      {
        type: "PLAY_FROM_DISCARD",
        playerId: "p1",
        cardId: "baths_3p",
      },
      rng,
    );

    expect(after.state.phase).toBe("DRAFTING");
    expect(after.state.players.p1.tableau).toContain("baths_3p");
    expect(after.state.players.p1.pendingAbility).toBeNull();
    expect(after.state.discardPile).not.toContain("baths_3p");
  });
});
