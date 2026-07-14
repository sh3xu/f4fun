import type { GameEvent, GameState } from "@f4fun/monopoly-engine";
import { GameEventModel } from "../../db/index.js";

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 11000
  );
}

async function nextSequence(gameId: string): Promise<number> {
  const last = await GameEventModel.findOne({ gameId })
    .sort({ sequence: -1 })
    .select({ sequence: 1 })
    .lean();
  return (last?.sequence ?? -1) + 1;
}

export async function logGameAction(
  gameId: string,
  roomId: string,
  playerId: string,
  action: string,
  stateBefore: GameState,
  stateAfter: GameState,
  events: GameEvent[],
): Promise<void> {
  // NOTE: Sequence must come from DB (not process memory) so hot-reload / restart
  // does not reuse (gameId, sequence) pairs already stored.
  for (let attempt = 0; attempt < 3; attempt++) {
    const sequence = await nextSequence(gameId);
    try {
      await GameEventModel.create({
        gameId,
        roomId,
        sequence,
        turn: stateAfter.activePlayerIndex,
        playerId,
        action,
        events,
        stateBefore: stateToLog(stateBefore),
        stateAfter: stateToLog(stateAfter),
        timestamp: new Date(),
      });
      return;
    } catch (err) {
      if (isDuplicateKeyError(err) && attempt < 2) continue;
      throw err;
    }
  }
}

export async function getGameEventLog(
  gameId: string,
  fromSequence = 0,
): Promise<
  Array<{
    sequence: number;
    turn: number;
    action: string;
    events: GameEvent[];
    timestamp: Date;
  }>
> {
  const docs = await GameEventModel.find({
    gameId,
    sequence: { $gte: fromSequence },
  })
    .sort({ sequence: 1 })
    .lean();

  return docs.map((doc) => ({
    sequence: doc.sequence,
    turn: doc.turn,
    action: doc.action,
    events: doc.events as GameEvent[],
    timestamp: doc.timestamp,
  }));
}

function stateToLog(state: GameState): Record<string, unknown> {
  return {
    gameId: state.gameId,
    phase: state.phase,
    activePlayerIndex: state.activePlayerIndex,
    players: Object.entries(state.players).map(([id, p]) => ({
      id,
      name: p.name,
      position: p.position,
      cash: p.cash,
      ownedPositions: p.ownedPositions,
      isInJail: p.isInJail,
      isBankrupt: p.isBankrupt,
    })),
    lastDice: state.lastDice,
    doublesCount: state.doublesCount,
    winnerId: state.winnerId,
  };
}
