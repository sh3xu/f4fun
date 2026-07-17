import type { GameState } from "./types.js";

/** Deep clone game state for safe simulation without mutating authoritative state. */
export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}
