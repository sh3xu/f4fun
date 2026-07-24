import { randomBytes } from "node:crypto";
import { type GameState, resolveWinnerId } from "@f4fun/seven-wonders-engine";
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
    gameType: "sevenWonders",
    state: state as unknown as Record<string, unknown>,
    turnCount: 0,
    startedAt: new Date(),
    finishedAt: null,
    winnerId: null,
  });
}

export async function loadGame(gameId: string): Promise<GameState | null> {
  const doc = await GameModel.findOne({ gameId, gameType: "sevenWonders" });
  return doc ? (doc.state as unknown as GameState) : null;
}

export async function loadGameByRoomId(
  roomId: string,
): Promise<GameState | null> {
  const doc = await GameModel.findOne({
    roomId,
    gameType: "sevenWonders",
  }).sort({ createdAt: -1 });
  return doc ? (doc.state as unknown as GameState) : null;
}

export async function saveGame(
  gameId: string,
  state: GameState,
  turnCountDelta = 0,
): Promise<boolean> {
  const update: Record<string, unknown> = {
    state: state as unknown as Record<string, unknown>,
  };
  if (state.phase === "GAME_OVER" && state.finalScores) {
    update.finishedAt = new Date();
    // NOTE: null when VP + treasury coins still tie (shared victory).
    update.winnerId = resolveWinnerId(state, state.finalScores);
  }

  if (turnCountDelta > 0) {
    const result = await GameModel.updateOne(
      { gameId, gameType: "sevenWonders" },
      { $set: update, $inc: { turnCount: turnCountDelta } },
    );
    return result.matchedCount > 0;
  }

  const result = await GameModel.updateOne(
    { gameId, gameType: "sevenWonders" },
    { $set: update },
  );
  return result.matchedCount > 0;
}
