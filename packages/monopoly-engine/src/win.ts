import type { GameEvent, GameState, PlayerId } from "./types.js";

export function checkWinCondition(state: GameState): GameEvent[] {
  const solventPlayers = state.turnOrder.filter(
    (id) => !state.players[id]?.isBankrupt,
  );

  if (solventPlayers.length === 1) {
    const winnerId = solventPlayers[0];
    state.winnerId = winnerId;
    state.phase = "GAME_OVER";

    return [{ type: "GAME_WON", winnerId }];
  }

  return [];
}

export function getWinner(state: GameState): PlayerId | null {
  return state.winnerId;
}
