import { BotPlayer, expertStrategy, resolveActorId } from "@f4fun/monopoly-bot";
import type { GameAction, GameEvent, GameState } from "@f4fun/monopoly-engine";
import { getLegalActions, timeoutActionForState } from "@f4fun/monopoly-engine";
import type { Server } from "socket.io";
import { getBotPlayerIds } from "../../../rooms/RoomManager.js";
import {
  type ExecuteIntentOptions,
  emitDiceRolledEvents,
  executeGameIntent,
} from "../executeGameIntent.js";

interface BotTimerEntry {
  timer: ReturnType<typeof setTimeout>;
  stateKey: string;
}

const botTimers = new Map<string, BotTimerEntry>();
const botPlayers = new Map<string, BotPlayer>();

/** Mirrors client DiceRoller TUMBLE_MS. */
const DICE_ANIMATION_MS = 800;
/** Mirrors client PieceMover MAX_MOVE_MS cap for token hops. */
const MOVE_ANIMATION_MS = 3200;
/** Extra settle time after animations before the bot acts. */
const ANIMATION_SETTLE_MS = 400;

function botTimerKey(roomId: string, actorId: string): string {
  return `${roomId}:${actorId}`;
}

function clearBotTimer(roomId: string, actorId: string): void {
  const key = botTimerKey(roomId, actorId);
  const entry = botTimers.get(key);
  if (entry) {
    clearTimeout(entry.timer);
    botTimers.delete(key);
  }
}

export function clearAllBotTimers(roomId: string): void {
  for (const [key, entry] of botTimers) {
    if (key.startsWith(`${roomId}:`)) {
      clearTimeout(entry.timer);
      botTimers.delete(key);
    }
  }
}

function stateKey(state: GameState, actorId: string): string {
  return `${state.phase}:${actorId}:${state.pendingTrades.map((t) => t.tradeId).join(",")}`;
}

function intentOptionsFor(action: GameAction): ExecuteIntentOptions {
  const base: ExecuteIntentOptions = {
    actionName: action.type,
    requireActiveTurn: true,
  };

  switch (action.type) {
    case "PLACE_BID":
    case "PASS_AUCTION":
    case "ACCEPT_TRADE":
    case "REJECT_TRADE":
      return { ...base, requireActiveTurn: false };
    case "END_TURN":
      return { ...base, turnCountDelta: 1 };
    case "ROLL_DICE":
    case "ROLL_FOR_JAIL":
      return { ...base, onEvents: emitDiceRolledEvents };
    default:
      return base;
  }
}

function thinkingDelayMs(): number {
  return 900 + Math.floor(Math.random() * 1100);
}

/**
 * NOTE: Server cannot observe client animation completion — approximate wait so
 * bots do not act through in-flight dice/token animations.
 */
function animationWaitMs(events: readonly GameEvent[]): number {
  let wait = 0;
  const hasDice = events.some((e) => e.type === "DICE_ROLLED");
  const sentOrReleased = events.some(
    (e) => e.type === "SENT_TO_JAIL" || e.type === "RELEASED_FROM_JAIL",
  );
  const cardApplied = events.some((e) => e.type === "CARD_APPLIED");

  if (hasDice) {
    wait += DICE_ANIMATION_MS + MOVE_ANIMATION_MS;
  } else if (sentOrReleased) {
    wait += MOVE_ANIMATION_MS;
  } else if (cardApplied) {
    // NOTE: Money/effect cards are short; movement cards may hop — use mid wait.
    wait += 1600;
  }

  if (wait > 0) wait += ANIMATION_SETTLE_MS;
  return wait;
}

function getBotPlayer(playerId: string): BotPlayer {
  let bot = botPlayers.get(playerId);
  if (!bot) {
    bot = new BotPlayer(expertStrategy);
    botPlayers.set(playerId, bot);
  }
  return bot;
}

export async function isBotActor(
  roomId: string,
  actorId: string,
): Promise<boolean> {
  const botIds = await getBotPlayerIds(roomId);
  return botIds.includes(actorId);
}

export function scheduleBotActions(
  io: Server,
  roomId: string,
  state: GameState,
  events: readonly GameEvent[] = [],
): void {
  if (state.phase === "GAME_OVER" || state.winnerId) {
    clearAllBotTimers(roomId);
    return;
  }

  void (async () => {
    const botIds = await getBotPlayerIds(roomId);
    if (botIds.length === 0) return;

    const actorId = resolveActorId(state);
    if (!actorId || !botIds.includes(actorId)) return;

    const key = botTimerKey(roomId, actorId);
    const nextKey = stateKey(state, actorId);
    const existing = botTimers.get(key);
    if (existing?.stateKey === nextKey) return;

    clearBotTimer(roomId, actorId);

    const delay = thinkingDelayMs() + animationWaitMs(events);
    const timer = setTimeout(() => {
      void runBotTurn(io, roomId, actorId);
    }, delay);

    botTimers.set(key, { timer, stateKey: nextKey });
  })();
}

async function runBotTurn(
  io: Server,
  roomId: string,
  actorId: string,
): Promise<void> {
  clearBotTimer(roomId, actorId);

  const botIds = await getBotPlayerIds(roomId);
  if (!botIds.includes(actorId)) return;

  const { loadGameByRoomId } = await import("../GameStore.js");
  const state = await loadGameByRoomId(roomId);
  if (!state || state.phase === "GAME_OVER" || state.winnerId) return;

  const currentActor = resolveActorId(state);
  if (currentActor !== actorId) return;

  let legal = getLegalActions(state, actorId);
  if (legal.length === 0 && state.phase === "RAISE_CASH" && state.pendingDebt) {
    legal = [{ type: "FORCE_SETTLE_DEBT" }];
  }
  if (legal.length === 0) {
    const timed = timeoutActionForState(state);
    if (timed && timed.actorId === actorId) {
      legal = [timed.action];
    }
  }

  const bot = getBotPlayer(actorId);
  let decision: { action: GameAction; reasoning: string };
  try {
    decision = bot.decide(state, actorId, legal);
  } catch {
    return;
  }

  io.to(roomId).emit("game:botReasoning", {
    playerId: actorId,
    message: decision.reasoning,
  });

  const result = await executeGameIntent(
    io,
    roomId,
    actorId,
    decision.action,
    intentOptionsFor(decision.action),
  );

  if (!result.ok) {
    console.error("[BotRuntime] Action failed:", result.error, decision.action);
  }
}
