import { describe, expect, it } from "vitest";
import { getCardById } from "../config/cards.js";
import { getWonderById } from "../config/wonders.js";
import { applyAction, createInitialState } from "../engine.js";
import { canAfford, hasChainFrom } from "../resources.js";
import type { GameState, PickAction, PlayerConfig, RNG } from "../types.js";

function seededRng(seed: number): RNG {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makePlayers(count: number): PlayerConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player${i + 1}`,
    token: `t${i + 1}`,
  }));
}

function canPlayCard(
  state: GameState,
  playerId: string,
  cardId: string,
): boolean {
  const player = state.players[playerId];
  const card = getCardById(cardId);

  if (player.tableau.some((id) => getCardById(id).name === card.name)) {
    return false;
  }

  if (hasChainFrom(player, card)) return true;

  const coinCost = card.cost.coins ?? 0;
  const resourceCost = card.cost.resources ?? {};
  return canAfford(state, playerId, resourceCost, coinCost) !== null;
}

function canStageWonder(state: GameState, playerId: string): boolean {
  const player = state.players[playerId];
  const wonder = getWonderById(player.wonderId);
  if (player.wonderStagesBuilt >= wonder.stages.length) return false;
  const stage = wonder.stages[player.wonderStagesBuilt];
  return canAfford(state, playerId, stage.cost, 0) !== null;
}

/**
 * Prefer playable cards, then wonder staging, else discard.
 * Deterministic: first legal option in hand order.
 */
function choosePick(
  state: GameState,
  playerId: string,
): { action: PickAction; cardId: string } {
  const hand = state.hands[playerId];
  if (!hand || hand.length === 0) {
    throw new Error(`Empty hand for ${playerId}`);
  }

  for (const cardId of hand) {
    if (canPlayCard(state, playerId, cardId)) {
      return { action: "PLAY", cardId };
    }
  }

  if (canStageWonder(state, playerId)) {
    return { action: "STAGE_WONDER", cardId: hand[0] };
  }

  return { action: "DISCARD", cardId: hand[0] };
}

function resolveSimultaneousTurn(state: GameState, rng: RNG): GameState {
  // NOTE: All picks must be chosen against the same pre-turn state.
  const picks = state.turnOrder.map((playerId) => {
    const pick = choosePick(state, playerId);
    return {
      type: "SUBMIT_PICK" as const,
      playerId,
      action: pick.action,
      cardId: pick.cardId,
    };
  });

  let next = state;
  for (const pick of picks) {
    next = applyAction(next, pick, rng).state;
  }
  return next;
}

/** Play until GAME_OVER. Each age deals 7 cards and runs 6 picks (last card discarded). */
function playFullGame(playerCount: number, seed: number): GameState {
  const rng = seededRng(seed);
  let state = createInitialState(
    `sim-${playerCount}-${seed}`,
    makePlayers(playerCount),
    rng,
  );

  // 3 ages × 6 turns = 18; allow a small cushion for safety.
  const maxTurns = 24;
  let turns = 0;

  while (state.phase !== "GAME_OVER" && turns < maxTurns) {
    expect(state.phase).toBe("DRAFTING");
    for (const pid of state.turnOrder) {
      expect(state.hands[pid].length).toBeGreaterThan(0);
    }

    state = resolveSimultaneousTurn(state, rng);
    turns += 1;
  }

  expect(state.phase).toBe("GAME_OVER");
  return state;
}

describe("complete game simulation", () => {
  it("plays a full 3-age game with 3 players to GAME_OVER with scores", () => {
    const state = playFullGame(3, 42);

    expect(state.age).toBe(3);
    expect(state.finalScores).toBeDefined();

    for (const pid of state.turnOrder) {
      const score = state.finalScores?.[pid];
      expect(score).toBeDefined();

      expect(score?.total).toBeGreaterThanOrEqual(0);
      expect(score?.military).toEqual(
        state.players[pid].militaryTokens.reduce((a, b) => a + b, 0),
      );
      expect(score?.coins).toBe(Math.floor(state.players[pid].coins / 3));
      expect(
        (score?.military ?? 0) +
          (score?.coins ?? 0) +
          (score?.wonder ?? 0) +
          (score?.civilian ?? 0) +
          (score?.science ?? 0) +
          (score?.commerce ?? 0) +
          (score?.guild ?? 0),
      ).toBe(score?.total);
    }

    // Each seat fights both neighbors each age; ties add no token (0–6 total).
    for (const pid of state.turnOrder) {
      const tokens = state.players[pid].militaryTokens;
      expect(tokens.length).toBeLessThanOrEqual(6);
    }
  });

  it("completes full games for 3–7 players across seeds", () => {
    for (const playerCount of [3, 4, 5, 6, 7] as const) {
      for (const seed of [1, 99, 12345] as const) {
        const state = playFullGame(playerCount, seed);
        expect(state.phase).toBe("GAME_OVER");
        expect(Object.keys(state.finalScores ?? {})).toHaveLength(playerCount);

        const totals = Object.values(state.finalScores ?? {}).map(
          (s) => s.total,
        );
        expect(totals.every((t) => Number.isFinite(t))).toBe(true);
      }
    }
  });

  it("builds at least some cards or wonder stages during a mixed strategy game", () => {
    const state = playFullGame(4, 7);

    const builtSomething = state.turnOrder.some((pid) => {
      const p = state.players[pid];
      return p.tableau.length > 0 || p.wonderStagesBuilt > 0;
    });
    expect(builtSomething).toBe(true);

    // Discard pile should hold leftover last cards + discarded picks.
    expect(state.discardPile.length).toBeGreaterThan(0);
  });

  it("advances pass direction by age (LEFT → RIGHT → LEFT)", () => {
    const rng = seededRng(55);
    let state = createInitialState("pass-check", makePlayers(3), rng);
    expect(state.passDirection).toBe("LEFT");

    while (state.age === 1 && state.phase === "DRAFTING") {
      state = resolveSimultaneousTurn(state, rng);
    }
    expect(state.age).toBe(2);
    expect(state.passDirection).toBe("RIGHT");

    while (state.age === 2 && state.phase === "DRAFTING") {
      state = resolveSimultaneousTurn(state, rng);
    }
    expect(state.age).toBe(3);
    expect(state.passDirection).toBe("LEFT");

    while (state.phase === "DRAFTING") {
      state = resolveSimultaneousTurn(state, rng);
    }
    expect(state.phase).toBe("GAME_OVER");
  });
});
