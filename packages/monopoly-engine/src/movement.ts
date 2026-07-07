import { BOARD_SIZE, GO_POSITION, GO_SALARY } from "./config/board.js";
import type { GameEvent, GameState, PlayerId } from "./types.js";

export interface MoveResult {
  newPosition: number;
  passedGo: boolean;
}

export function movePlayer(
  currentPosition: number,
  spaces: number,
): MoveResult {
  const newPosition = (currentPosition + spaces) % BOARD_SIZE;
  const passedGo = currentPosition + spaces >= BOARD_SIZE;
  return { newPosition, passedGo };
}

export function applyMove(
  state: GameState,
  playerId: PlayerId,
  spaces: number,
): GameEvent[] {
  const player = state.players[playerId];
  if (!player) return [];

  const { newPosition, passedGo } = movePlayer(player.position, spaces);
  player.position = newPosition;

  const events: GameEvent[] = [];

  if (passedGo && newPosition !== GO_POSITION) {
    player.cash += GO_SALARY;
    events.push({
      type: "PASSED_GO",
      playerId,
      amount: GO_SALARY,
    });
  }

  return events;
}

export function setPlayerPosition(
  state: GameState,
  playerId: PlayerId,
  targetPosition: number,
  collectGoIfPassed: boolean = true,
): GameEvent[] {
  const player = state.players[playerId];
  if (!player) return [];

  const oldPosition = player.position;
  const events: GameEvent[] = [];

  if (
    collectGoIfPassed &&
    targetPosition < oldPosition &&
    targetPosition !== GO_POSITION
  ) {
    player.cash += GO_SALARY;
    events.push({
      type: "PASSED_GO",
      playerId,
      amount: GO_SALARY,
    });
  }

  player.position = targetPosition;
  return events;
}
