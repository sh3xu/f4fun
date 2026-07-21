import { describe, expect, it } from "vitest";
import {
  baselineStrategy,
  expertStrategy,
  runHeadlessGame,
  seededRng,
} from "../index.js";

describe("expert vs baseline", () => {
  it("expert wins at least 70% of games against baseline", () => {
    let expertWins = 0;
    const total = 20;

    for (let game = 0; game < total; game++) {
      const players = [
        { id: "expert", name: "Expert", token: "memo_1" },
        { id: "baseline", name: "Baseline", token: "memo_2" },
      ];
      const strategies = new Map([
        ["expert", expertStrategy],
        ["baseline", baselineStrategy],
      ]);
      const rng = seededRng(5000 + game);
      const result = runHeadlessGame(players, strategies, rng, `evb-${game}`);

      expect(result.winnerId).not.toBeNull();
      if (result.winnerId === "expert") {
        expertWins++;
      }
    }

    expect(expertWins / total).toBeGreaterThanOrEqual(0.7);
  }, 180_000);
});
