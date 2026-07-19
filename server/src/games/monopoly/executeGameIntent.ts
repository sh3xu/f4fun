import {
  partnerTradeConditionKey,
  pendingTradeFingerprint,
} from "@f4fun/monopoly-bot";
import {
  applyAction,
  type GameAction,
  type GameEvent,
  type GameState,
  getActivePlayer,
  getCurrentAuctionBidder,
  healStuckRaiseCash,
  pauseActionDeadline,
  resumeActionDeadline,
  stampActionDeadline,
} from "@f4fun/monopoly-engine";
import type { Server } from "socket.io";
import { rememberRejectedDealForProposer } from "./bot-runtime/botMemory.js";
import {
  afterGameStateCommit,
  ensureTradeExpiries,
  mergeGameConfig,
} from "./DeadlineTimers.js";
import { logGameAction } from "./GameEventLogger.js";
import { loadGameByRoomId, saveGame } from "./GameStore.js";
import { withRoomLock } from "./roomMutex.js";

export type ExecuteIntentResult =
  | { ok: true; events: GameEvent[]; state: GameState }
  | { ok: false; error: string };

export type ExecuteIntentOptions = {
  requireActiveTurn?: boolean;
  turnCountDelta?: number;
  actionName: string;
  onEvents?: (io: Server, roomId: string, events: readonly GameEvent[]) => void;
};

/** Backfill fields added after older persisted games. Returns true if mutated. */
export function normalizeState(state: GameState): boolean {
  let changed = false;
  if (state.auction === undefined) {
    state.auction = null;
    changed = true;
  }
  if (state.pendingTrades === undefined) {
    state.pendingTrades = [];
    changed = true;
  }
  if (state.actionDeadlineAt === undefined) {
    state.actionDeadlineAt = null;
    changed = true;
  }
  if (state.actionDeadlinePausedMs === undefined) {
    state.actionDeadlinePausedMs = null;
    changed = true;
  }
  if (state.pendingDebt === undefined) {
    state.pendingDebt = null;
    changed = true;
  }
  // NOTE: Issue #42 — heal RAISE_CASH left with cleared pendingDebt.
  if (healStuckRaiseCash(state)) {
    stampActionDeadline(state);
    changed = true;
  }
  if (state.auction && !Array.isArray(state.auction.bidHistory)) {
    state.auction.bidHistory = [];
    changed = true;
  }
  mergeGameConfig(state);
  if (ensureTradeExpiries(state)) changed = true;
  return changed;
}

export function refreshActionDeadline(
  stateBefore: GameState,
  stateAfter: GameState,
  events: readonly GameEvent[],
): void {
  const proposed = events.some((e) => e.type === "TRADE_PROPOSED");
  const tradeResolved =
    events.some(
      (e) => e.type === "TRADE_COMPLETED" || e.type === "TRADE_REJECTED",
    ) && stateAfter.pendingTrades.length === 0;

  if (proposed) {
    pauseActionDeadline(stateAfter);
    return;
  }

  if (tradeResolved) {
    resumeActionDeadline(stateAfter);
    return;
  }

  const enteredAuction =
    stateBefore.phase !== "AUCTION" && stateAfter.phase === "AUCTION";
  if (enteredAuction) {
    stampActionDeadline(stateAfter);
    return;
  }

  const leftAuction =
    stateBefore.phase === "AUCTION" && stateAfter.phase !== "AUCTION";
  if (leftAuction && stateAfter.actionDeadlineAt) {
    return;
  }

  const bidderBefore =
    stateBefore.phase === "AUCTION"
      ? getCurrentAuctionBidder(stateBefore)
      : null;
  const bidderAfter =
    stateAfter.phase === "AUCTION" ? getCurrentAuctionBidder(stateAfter) : null;
  const shouldRestamp =
    stateAfter.phase !== stateBefore.phase ||
    bidderBefore !== bidderAfter ||
    (!stateBefore.actionDeadlineAt &&
      stateBefore.actionDeadlinePausedMs == null);

  if (shouldRestamp) {
    stampActionDeadline(stateAfter);
  } else {
    stateAfter.actionDeadlineAt = stateBefore.actionDeadlineAt;
    stateAfter.actionDeadlinePausedMs = stateBefore.actionDeadlinePausedMs;
  }
}

export function emitDiceRolledEvents(
  server: Server,
  roomId: string,
  events: readonly GameEvent[],
): void {
  for (const event of events) {
    if (event.type === "DICE_ROLLED") {
      server.to(roomId).emit("game:diceRolled", {
        playerId: event.playerId,
        dice: event.dice,
        newPosition: event.newPosition,
      });
    }
  }
}

export async function executeGameIntent(
  io: Server,
  roomId: string,
  playerId: string,
  action: GameAction,
  options: ExecuteIntentOptions,
): Promise<ExecuteIntentResult> {
  return withRoomLock(roomId, async () => {
    const loaded = await loadGameByRoomId(roomId);
    if (!loaded) {
      return { ok: false, error: "Game not found" };
    }

    const backfilled = normalizeState(loaded);
    const state = loaded;

    if (options.requireActiveTurn !== false) {
      const activePlayerId = getActivePlayer(state);
      if (activePlayerId !== playerId) {
        return { ok: false, error: "Not your turn" };
      }
    }

    const stateBefore = JSON.parse(JSON.stringify(state)) as GameState;

    // NOTE: Capture deal fingerprint before reject clears pendingTrades.
    let rejectedFingerprint: {
      fromPlayerId: string;
      key: string;
      partnerCondition: string;
    } | null = null;
    if (action.type === "REJECT_TRADE") {
      const trade = state.pendingTrades.find(
        (t) => t.tradeId === action.tradeId,
      );
      if (trade) {
        rejectedFingerprint = {
          fromPlayerId: trade.fromPlayerId,
          key: pendingTradeFingerprint(trade),
          partnerCondition: partnerTradeConditionKey(state, trade.toPlayerId),
        };
      }
    }

    const result = applyAction(state, action, Math.random, playerId);

    if (result.error) {
      if (backfilled) {
        const saved = await saveGame(state.gameId, state, 0);
        if (!saved) {
          return { ok: false, error: "Game not found" };
        }
        afterGameStateCommit(io, roomId, state);
      }
      return { ok: false, error: result.error };
    }

    if (rejectedFingerprint) {
      rememberRejectedDealForProposer(
        rejectedFingerprint.fromPlayerId,
        rejectedFingerprint.key,
        rejectedFingerprint.partnerCondition,
      );
    }

    refreshActionDeadline(stateBefore, result.state, result.events);
    const saved = await saveGame(
      result.state.gameId,
      result.state,
      options.turnCountDelta ?? 0,
    );
    if (!saved) {
      return { ok: false, error: "Game not found" };
    }

    try {
      await logGameAction(
        result.state.gameId,
        roomId,
        playerId,
        options.actionName,
        stateBefore,
        result.state,
        result.events,
      );
    } catch (logErr) {
      console.error("[GameEventLogger] Failed to log action:", logErr);
    }

    io.to(roomId).emit("game:stateUpdated", {
      state: result.state,
      events: result.events,
    });

    options.onEvents?.(io, roomId, result.events);
    afterGameStateCommit(io, roomId, result.state, result.events);

    return { ok: true, events: result.events, state: result.state };
  });
}
