import { describe, expect, it } from "vitest";
import { expertStrategy, runHeadlessGame, seededRng } from "../index.js";

function makePlayers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Bot ${i + 1}`,
    token: `memo_${(i % 8) + 1}`,
  }));
}

function expertMap(ids: string[]) {
  return new Map(ids.map((id) => [id, expertStrategy]));
}

describe("simulation", () => {
  it("completes 2-4 player expert games within turn limit", () => {
    for (const count of [2, 3, 4]) {
      for (let game = 0; game < 2; game++) {
        const players = makePlayers(count);
        const strategies = expertMap(players.map((p) => p.id));
        const rng = seededRng(1000 + count * 100 + game);
        const result = runHeadlessGame(
          players,
          strategies,
          rng,
          `sim-${count}-${game}`,
        );

        expect(result.turns).toBeLessThanOrEqual(3500);
        expect(result.winnerId).not.toBeNull();
        expect(result.state.phase).toBe("GAME_OVER");
      }
    }
  }, 180_000);
});
