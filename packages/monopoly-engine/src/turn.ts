import type { GameEvent, GameState, PlayerId } from "./types.js";

export function getActivePlayer(state: GameState): PlayerId | null {
  if (state.turnOrder.length === 0) return null;
  return state.turnOrder[state.activePlayerIndex];
}

export function advanceTurn(state: GameState): GameEvent[] {
  const solventPlayers = state.turnOrder.filter(
    (id) => !state.players[id]?.isBankrupt,
  );

  if (solventPlayers.length <= 1) {
    return [];
  }

  let nextIndex = (state.activePlayerIndex + 1) % state.turnOrder.length;

  while (state.players[state.turnOrder[nextIndex]]?.isBankrupt) {
    nextIndex = (nextIndex + 1) % state.turnOrder.length;
  }

  state.activePlayerIndex = nextIndex;
  state.doublesCount = 0;
  state.phase = "PRE_ROLL";

  const nextPlayerId = state.turnOrder[nextIndex];

  if (state.players[nextPlayerId]?.isInJail) {
    state.phase = "JAIL_DECISION";
  }

  return [{ type: "TURN_ADVANCED", playerId: nextPlayerId }];
}
