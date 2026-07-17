import { getActivePlayer } from "./turn.js";
import type { GameState, PlayerId } from "./types.js";

export function isManagementPhase(phase: GameState["phase"]): boolean {
  return (
    phase === "PRE_ROLL" ||
    phase === "END_TURN" ||
    phase === "JAIL_DECISION" ||
    phase === "RAISE_CASH"
  );
}

export function canManageAssets(state: GameState, actorId: PlayerId): boolean {
  if (!isManagementPhase(state.phase)) return false;

  if (state.phase === "RAISE_CASH") {
    return actorId === state.pendingDebt?.playerId;
  }

  return actorId === getActivePlayer(state);
}
