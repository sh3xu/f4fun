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

export interface SaveGameGuard {
  /** Require DB state still has this actionDeadlineAt (turn timeout path). */
  expectedActionDeadlineAt?: string | null;
  /** Require pending trade still present with this exact expiresAt. */
  expectedTrade?: { tradeId: string; expiresAt: string };
}

/**
 * Persist game state. When a guard is provided, returns false if the filter
 * no longer matches (concurrent mutation already advanced the game).
 */
export async function saveGame(
  gameId: string,
  state: GameState,
  turnCountDelta = 0,
  guard?: SaveGameGuard,
): Promise<boolean> {
  const filter: Record<string, unknown> = { gameId };

  if (guard?.expectedActionDeadlineAt !== undefined) {
    filter["state.actionDeadlineAt"] = guard.expectedActionDeadlineAt;
  }
  if (guard?.expectedTrade) {
    filter["state.pendingTrades"] = {
      $elemMatch: {
        tradeId: guard.expectedTrade.tradeId,
        expiresAt: guard.expectedTrade.expiresAt,
      },
    };
  }

  if (turnCountDelta > 0) {
    const result = await GameModel.updateOne(filter, {
      $set: { state },
      $inc: { turnCount: turnCountDelta },
    });
    return result.matchedCount > 0;
  }

  const update: Record<string, unknown> = { state };
  if (state.winnerId) {
    update.finishedAt = new Date();
    update.winnerId = state.winnerId;
  }
  const result = await GameModel.updateOne(filter, { $set: update });
  return result.matchedCount > 0;
}

export async function getGameHistory(
  gameId: string,
): Promise<GameState | null> {
  return loadGame(gameId);
}

/** Delete all game documents for a room. Returns deleted gameIds. */
export async function deleteGamesByRoomId(roomId: string): Promise<string[]> {
  const docs = await GameModel.find({ roomId }).select("gameId").lean();
  const gameIds = docs.map((d) => d.gameId);
  if (gameIds.length > 0) {
    await GameModel.deleteMany({ roomId });
  }
  return gameIds;
}
