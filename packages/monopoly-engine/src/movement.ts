import { BOARD_SIZE } from "./config/board.js";
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

function awardGoSalary(state: GameState, playerId: PlayerId): GameEvent | null {
  const player = state.players[playerId];
  if (!player) return null;

  const amount = state.config.goSalary;
  player.cash += amount;
  return {
    type: "PASSED_GO",
    playerId,
    amount,
  };
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

  // NOTE: Unified GO pay — salary on pass or land on GO (official).
  if (passedGo) {
    const event = awardGoSalary(state, playerId);
    if (event) events.push(event);
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

  // NOTE: target < old covers wrap past GO and Advance-to-Go (land on 0).
  if (collectGoIfPassed && targetPosition < oldPosition) {
    const event = awardGoSalary(state, playerId);
    if (event) events.push(event);
  }

  player.position = targetPosition;
  return events;
}
