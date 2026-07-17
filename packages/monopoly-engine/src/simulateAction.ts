import { applyAction } from "./applyAction.js";
import { cloneState } from "./cloneState.js";
import type {
  ApplyResult,
  GameAction,
  GameState,
  PlayerId,
  RNG,
} from "./types.js";
import { releaseCardRevealPause } from "./types.js";

/**
 * Apply an action on a cloned state; the input state is never mutated.
 * Uses the same rules path as live gameplay.
 */
export function simulateAction(
  state: GameState,
  action: GameAction,
  rng: RNG = Math.random,
  actorId?: PlayerId,
): ApplyResult {
  const clone = cloneState(state);
  // NOTE: Reveal pause is a live UX gate; legality probes must still see ACK as valid.
  releaseCardRevealPause(clone);
  return applyAction(clone, action, rng, actorId);
}
