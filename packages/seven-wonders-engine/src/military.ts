import { getNeighborIds, getPlayerShields } from "./resources.js";
import type { GameState } from "./types.js";

export function resolveMilitary(state: GameState): GameState {
  const victoryPoints = state.age === 1 ? 1 : state.age === 2 ? 3 : 5;
  const next = structuredClone(state);

  for (const playerId of next.turnOrder) {
    const player = next.players[playerId];
    const myShields = getPlayerShields(player);
    const [leftId, rightId] = getNeighborIds(next, playerId);
    const leftShields = getPlayerShields(next.players[leftId]);
    const rightShields = getPlayerShields(next.players[rightId]);

    if (myShields > leftShields) {
      player.militaryTokens.push(victoryPoints);
    } else if (myShields < leftShields) {
      player.militaryTokens.push(-1);
    }

    if (myShields > rightShields) {
      player.militaryTokens.push(victoryPoints);
    } else if (myShields < rightShields) {
      player.militaryTokens.push(-1);
    }
  }

  return next;
}
