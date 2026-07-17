import { resolveActorId } from "@f4fun/monopoly-bot";
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
import { isBotActor, scheduleBotActions } from "./bot-runtime/BotScheduler.js";
import { logGameAction } from "./GameEventLogger.js";
import { loadGameByRoomId, saveGame } from "./GameStore.js";
import { withRoomLock } from "./roomMutex.js";

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

function tradeTimerKey(roomId: string, tradeId: string): string {
  return `${roomId}:${tradeId}`;
}

export function mergeGameConfig(state: GameState): void {
  state.config = { ...DEFAULT_GAME_CONFIG, ...state.config };
}

/** Backfill missing expiresAt. Returns true when state was mutated. */
export function ensureTradeExpiries(
  state: GameState,
  nowMs: number = Date.now(),
): boolean {
  let changed = false;
  for (const trade of state.pendingTrades) {
    if (!trade.expiresAt) {
      trade.expiresAt = new Date(
        nowMs + state.config.tradeTimeoutSecs * 1000,
      ).toISOString();
      changed = true;
    }
  }
  return changed;
}

export function clearTurnTimer(roomId: string): void {
  const entry = turnTimers.get(roomId);
  if (entry) {
    clearTimeout(entry.timer);
    turnTimers.delete(roomId);
  }
}

export function clearRoomTradeTimers(roomId: string): void {
  for (const [key, entry] of tradeTimers) {
    if (entry.roomId === roomId) {
      clearTimeout(entry.timer);
      tradeTimers.delete(key);
    }
  }
}

/** Clear turn + trade timers for a destroyed room. */
export function clearAllRoomTimers(roomId: string): void {
  clearTurnTimer(roomId);
  clearRoomTradeTimers(roomId);
  void import("./bot-runtime/BotScheduler.js").then((m) =>
    m.clearAllBotTimers(roomId),
  );
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
  const key = tradeTimerKey(roomId, trade.tradeId);
  const existing = tradeTimers.get(key);
  if (existing && existing.expiresAt === trade.expiresAt) {
    return;
  }
  if (existing) {
    clearTimeout(existing.timer);
    tradeTimers.delete(key);
  }

  const delayMs = Math.max(0, new Date(trade.expiresAt).getTime() - Date.now());
  const timer = setTimeout(() => {
    void onTradeTimeout(io, roomId, trade.tradeId, trade.expiresAt);
  }, delayMs);

  tradeTimers.set(key, {
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
  void syncTradeTimersAsync(io, roomId, state);
}

async function syncTradeTimersAsync(
  io: Server,
  roomId: string,
  state: GameState,
): Promise<void> {
  const pendingIds = new Set(state.pendingTrades.map((t) => t.tradeId));

  for (const [key, entry] of tradeTimers) {
    if (entry.roomId === roomId && !pendingIds.has(entry.tradeId)) {
      clearTimeout(entry.timer);
      tradeTimers.delete(key);
    }
  }

  for (const trade of state.pendingTrades) {
    if (await isBotActor(roomId, trade.toPlayerId)) {
      continue;
    }
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
  void afterGameStateCommitAsync(io, roomId, state);
}

async function afterGameStateCommitAsync(
  io: Server,
  roomId: string,
  state: GameState,
): Promise<void> {
  const actorId = resolveActorId(state);
  const botTurn = actorId ? await isBotActor(roomId, actorId) : false;

  if (!botTurn) {
    scheduleTurnTimer(io, roomId, state);
  } else {
    clearTurnTimer(roomId);
  }

  syncTradeTimers(io, roomId, state);
  scheduleBotActions(io, roomId, state);
}

async function onTurnTimeout(
  io: Server,
  roomId: string,
  expectedDeadline: string,
  expectedPhase: string,
): Promise<void> {
  turnTimers.delete(roomId);

  try {
    await withRoomLock(roomId, async () => {
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
      const result = applyAction(
        state,
        timed.action,
        Math.random,
        timed.actorId,
      );
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
      const saved = await saveGame(
        result.state.gameId,
        result.state,
        turnCountDelta,
        { expectedActionDeadlineAt: expectedDeadline },
      );
      if (!saved) return;

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
    });
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
  tradeTimers.delete(tradeTimerKey(roomId, tradeId));

  try {
    await withRoomLock(roomId, async () => {
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
      const saved = await saveGame(result.state.gameId, result.state, 0, {
        expectedTrade: { tradeId, expiresAt: expectedExpiresAt },
      });
      if (!saved) return;

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
    });
  } catch (err) {
    console.error("[TradeTimer] Timeout handler error:", err);
  }
}
