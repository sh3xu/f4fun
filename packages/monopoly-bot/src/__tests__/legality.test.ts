import {
  applyAction,
  createInitialState,
  getLegalActions,
  releaseCardRevealPause,
  simulateAction,
} from "@f4fun/monopoly-engine";
import { describe, expect, it } from "vitest";
import { BotPlayer } from "../decision/orchestrator.js";
import { resolveActorId } from "../simulate/runHeadlessGame.js";
import { seededRng } from "../simulate/seededRng.js";
import { expertStrategy } from "../strategy/expertStrategy.js";

describe("legality", () => {
  it("every expert bot action passes engine validation", () => {
    const players = [
      { id: "p1", name: "A", token: "memo_1" },
      { id: "p2", name: "B", token: "memo_2" },
    ];
    const bot = new BotPlayer(expertStrategy);
    let state = createInitialState("leg", players, {}, seededRng(42));
    let turns = 0;

    while (
      state.phase !== "GAME_OVER" &&
      state.winnerId === null &&
      turns < 300
    ) {
      const actorId = resolveActorId(state);
      if (!actorId) break;

      const legal = getLegalActions(state, actorId);
      const rng = seededRng(99 + turns);
      const decision = bot.decide(state, actorId, legal, rng);

      if (decision.action.type === "ACKNOWLEDGE_CARD") {
        releaseCardRevealPause(state);
      }

      const sim = simulateAction(state, decision.action, rng, actorId);
      expect(sim.error).toBeUndefined();

      const result = applyAction(state, decision.action, rng, actorId);
      expect(result.error).toBeUndefined();

      state = result.state;
      turns++;
    }
  });
});
