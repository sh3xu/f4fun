import { randomBytes } from "node:crypto";
import type { GameState } from "@f4fun/monopoly-engine";
import { GameModel } from "../../db/index.js";

export function generateGameId(): string {
  return randomBytes(8).toString("hex");
}

export async function createGame(
  roomId: string,
  state: GameState,
): Promise<void> {
  await GameModel.create({
    gameId: state.gameId,
    roomId,
    state,
    turnCount: 0,
    startedAt: new Date(),
    finishedAt: null,
    winnerId: null,
  });
}

export async function loadGame(gameId: string): Promise<GameState | null> {
  const doc = await GameModel.findOne({ gameId });
  return doc ? (doc.state as GameState) : null;
}

export async function loadGameByRoomId(
  roomId: string,
): Promise<GameState | null> {
  const doc = await GameModel.findOne({ roomId }).sort({ createdAt: -1 });
  return doc ? (doc.state as GameState) : null;
}

export async function saveGame(
  gameId: string,
  state: GameState,
  turnCountDelta = 0,
): Promise<void> {
  const update: Record<string, unknown> = { state };
  if (turnCountDelta > 0) {
    await GameModel.updateOne(
      { gameId },
      { $set: { state }, $inc: { turnCount: turnCountDelta } },
    );
    return;
  }
  if (state.winnerId) {
    update.finishedAt = new Date();
    update.winnerId = state.winnerId;
  }
  await GameModel.updateOne({ gameId }, { $set: update });
}

export async function getGameHistory(
  gameId: string,
): Promise<GameState | null> {
  return loadGame(gameId);
}
