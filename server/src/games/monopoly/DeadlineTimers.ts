import {
  applyAction,
  DEFAULT_GAME_CONFIG,
  type GameEvent,
  type GameState,
  type PendingTrade,
  resumeActionDeadline,
  stampActionDeadline,
  timeoutActionForState,
} from "@f4fun/monopoly-engine";
import type { Server } from "socket.io";
import { logGameAction } from "./GameEventLogger.js";
import { loadGameByRoomId, saveGame } from "./GameStore.js";

interface TurnTimerEntry {
  timer: ReturnType<typeof setTimeout>;
  deadlineAt: string;
  phase: string;
}

interface TradeTimerEntry {
  roomId: string;
  tradeId: string;
  expiresAt: string;
  timer: ReturnType<typeof setTimeout>;
}

const turnTimers = new Map<string, TurnTimerEntry>();
const tradeTimers = new Map<string, TradeTimerEntry>();

export function mergeGameConfig(state: GameState): void {
  state.config = { ...DEFAULT_GAME_CONFIG, ...state.config };
}

export function ensureTradeExpiries(
  state: GameState,
  nowMs: number = Date.now(),
): void {
  for (const trade of state.pendingTrades) {
    if (!trade.expiresAt) {
      trade.expiresAt = new Date(
        nowMs + state.config.tradeTimeoutSecs * 1000,
      ).toISOString();
    }
  }
}

export function clearTurnTimer(roomId: string): void {
  const entry = turnTimers.get(roomId);
  if (entry) {
    clearTimeout(entry.timer);
    turnTimers.delete(roomId);
  }
}

export function scheduleTurnTimer(
  io: Server,
  roomId: string,
  state: GameState,
): void {
  clearTurnTimer(roomId);

  // NOTE: Turn clock stays frozen while a trade is pending.
  if (
    state.pendingTrades.length > 0 ||
    state.actionDeadlinePausedMs != null ||
    !state.actionDeadlineAt ||
    state.phase === "GAME_OVER"
  ) {
    return;
  }

  const deadlineAt = state.actionDeadlineAt;
  const delayMs = Math.max(0, new Date(deadlineAt).getTime() - Date.now());
  const phase = state.phase;
  const timer = setTimeout(() => {
    void onTurnTimeout(io, roomId, deadlineAt, phase);
  }, delayMs);

  turnTimers.set(roomId, { timer, deadlineAt, phase });
}

function scheduleTradeExpiry(
  io: Server,
  roomId: string,
  trade: PendingTrade,
): void {
  const existing = tradeTimers.get(trade.tradeId);
  if (
    existing &&
    existing.expiresAt === trade.expiresAt &&
    existing.roomId === roomId
  ) {
    return;
  }
  if (existing) {
    clearTimeout(existing.timer);
    tradeTimers.delete(trade.tradeId);
  }

  const delayMs = Math.max(0, new Date(trade.expiresAt).getTime() - Date.now());
  const timer = setTimeout(() => {
    void onTradeTimeout(io, roomId, trade.tradeId, trade.expiresAt);
  }, delayMs);

  tradeTimers.set(trade.tradeId, {
    roomId,
    tradeId: trade.tradeId,
    expiresAt: trade.expiresAt,
    timer,
  });
}

export function syncTradeTimers(
  io: Server,
  roomId: string,
  state: GameState,
): void {
  const pendingIds = new Set(state.pendingTrades.map((t) => t.tradeId));

  for (const [key, entry] of tradeTimers) {
    if (entry.roomId === roomId && !pendingIds.has(entry.tradeId)) {
      clearTimeout(entry.timer);
      tradeTimers.delete(key);
    }
  }

  for (const trade of state.pendingTrades) {
    scheduleTradeExpiry(io, roomId, trade);
  }
}

/** Schedule turn-phase and trade expiry timers after a persisted state update. */
export function afterGameStateCommit(
  io: Server,
  roomId: string,
  state: GameState,
  _events: readonly GameEvent[] = [],
): void {
  scheduleTurnTimer(io, roomId, state);
  syncTradeTimers(io, roomId, state);
}

async function onTurnTimeout(
  io: Server,
  roomId: string,
  expectedDeadline: string,
  expectedPhase: string,
): Promise<void> {
  turnTimers.delete(roomId);

  try {
    const loaded = await loadGameByRoomId(roomId);
    if (!loaded) return;

    const state = loaded;
    if (
      state.actionDeadlineAt !== expectedDeadline ||
      state.phase !== expectedPhase ||
      state.pendingTrades.length > 0 ||
      state.actionDeadlinePausedMs != null
    ) {
      return;
    }

    const timed = timeoutActionForState(state);
    if (!timed) return;

    const stateBefore = JSON.parse(JSON.stringify(state)) as GameState;
    const result = applyAction(state, timed.action, Math.random, timed.actorId);
    if (result.error) {
      console.error(
        "[TurnTimer] Timeout action failed:",
        result.error,
        timed.action.type,
      );
      return;
    }

    stampActionDeadline(result.state);
    const turnCountDelta = timed.action.type === "END_TURN" ? 1 : 0;
    await saveGame(result.state.gameId, result.state, turnCountDelta);

    try {
      await logGameAction(
        result.state.gameId,
        roomId,
        timed.actorId,
        `TIMEOUT_${timed.action.type}`,
        stateBefore,
        result.state,
        result.events,
      );
    } catch (logErr) {
      console.error("[TurnTimer] Failed to log action:", logErr);
    }

    io.to(roomId).emit("game:stateUpdated", {
      state: result.state,
      events: result.events,
    });

    for (const event of result.events) {
      if (event.type === "DICE_ROLLED") {
        io.to(roomId).emit("game:diceRolled", {
          playerId: event.playerId,
          dice: event.dice,
          newPosition: event.newPosition,
        });
      }
    }

    afterGameStateCommit(io, roomId, result.state, result.events);
  } catch (err) {
    console.error("[TurnTimer] Timeout handler error:", err);
  }
}

async function onTradeTimeout(
  io: Server,
  roomId: string,
  tradeId: string,
  expectedExpiresAt: string,
): Promise<void> {
  tradeTimers.delete(tradeId);

  try {
    const loaded = await loadGameByRoomId(roomId);
    if (!loaded) return;

    const state = loaded;
    const trade = state.pendingTrades.find((t) => t.tradeId === tradeId);
    if (!trade || trade.expiresAt !== expectedExpiresAt) {
      return;
    }

    const stateBefore = JSON.parse(JSON.stringify(state)) as GameState;
    const result = applyAction(
      state,
      { type: "REJECT_TRADE", tradeId },
      Math.random,
      trade.toPlayerId,
    );
    if (result.error) {
      console.error("[TradeTimer] Auto-reject failed:", result.error);
      return;
    }

    resumeActionDeadline(result.state);
    await saveGame(result.state.gameId, result.state, 0);

    try {
      await logGameAction(
        result.state.gameId,
        roomId,
        trade.toPlayerId,
        "TIMEOUT_REJECT_TRADE",
        stateBefore,
        result.state,
        result.events,
      );
    } catch (logErr) {
      console.error("[TradeTimer] Failed to log action:", logErr);
    }

    io.to(roomId).emit("game:stateUpdated", {
      state: result.state,
      events: result.events,
    });

    afterGameStateCommit(io, roomId, result.state, result.events);
  } catch (err) {
    console.error("[TradeTimer] Timeout handler error:", err);
  }
}
