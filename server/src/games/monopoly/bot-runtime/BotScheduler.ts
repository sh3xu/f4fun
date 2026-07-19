import { resolveActorId } from "@f4fun/monopoly-bot";
import type { GameAction, GameEvent, GameState } from "@f4fun/monopoly-engine";
import {
  CARD_REVEAL_PAUSE_MS,
  getLegalActions,
  lookupCard,
  POST_LAND_CARD_PAUSE_MS,
  timeoutActionForState,
} from "@f4fun/monopoly-engine";
import type { Server } from "socket.io";
import { getBotPlayerIds } from "../../../rooms/RoomManager.js";
import {
  type ExecuteIntentOptions,
  emitDiceRolledEvents,
  executeGameIntent,
} from "../executeGameIntent.js";
import { getBotPlayer } from "./botMemory.js";

interface BotTimerEntry {
  timer: ReturnType<typeof setTimeout>;
  stateKey: string;
}

const botTimers = new Map<string, BotTimerEntry>();

/** Mirrors client DiceRoller TUMBLE_MS. */
const DICE_ANIMATION_MS = 800;
/** Mirrors client PieceMover hop timing. */
const MAX_HOP_SEQUENCE_MS = 3200;
const MIN_HOP_MS = 200;
const MAX_HOP_MS = 320;
const HOP_DWELL_MS = 200;
const FINAL_HOP_SETTLE_MS = 260;
/** Mirrors client PieceMover slide timing. */
const SLIDE_MIN_MS = 500;
const SLIDE_MAX_MS = 1400;
const SLIDE_PER_TILE_MS = 90;
/** Extra settle time after animations before the bot acts. */
const ANIMATION_SETTLE_MS = 400;
/** Conservative bound for forward card slides (Chance 7 -> Reading Railroad). */
const MAX_FORWARD_CARD_MOVE_HOPS = 38;
/** Longest shortest-path slide into jail used by the client. */
const MAX_JAIL_SLIDE_HOPS = 20;

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

function hopAnimationMs(hops: number): number {
  if (hops <= 0) return 0;
  const hopDurationMs = Math.min(
    MAX_HOP_MS,
    Math.max(MIN_HOP_MS, MAX_HOP_SEQUENCE_MS / hops),
  );
  return Math.ceil(
    hops * (hopDurationMs * 0.9 + HOP_DWELL_MS) + FINAL_HOP_SETTLE_MS,
  );
}

function slideAnimationMs(hops: number): number {
  if (hops <= 0) return 0;
  return Math.ceil(
    Math.min(SLIDE_MAX_MS, Math.max(SLIDE_MIN_MS, hops * SLIDE_PER_TILE_MS)),
  );
}

function cardAnimationMs(
  cardApplied: Extract<GameEvent, { type: "CARD_APPLIED" }>,
): number {
  const deck = cardApplied.cardId.startsWith("cc_")
    ? "community_chest"
    : "chance";
  const card = lookupCard(deck, cardApplied.cardId);
  if (!card) return 0;

  switch (card.effect.kind) {
    case "go_back_spaces":
      return slideAnimationMs(card.effect.spaces);
    case "go_to_jail":
      return slideAnimationMs(MAX_JAIL_SLIDE_HOPS);
    case "move_to":
    case "move_to_nearest":
      return slideAnimationMs(MAX_FORWARD_CARD_MOVE_HOPS);
    default:
      return 0;
  }
}

/**
 * NOTE: Server cannot observe client animation completion — approximate wait so
 * bots do not act through in-flight dice/token animations.
 */
function animationWaitMs(events: readonly GameEvent[]): number {
  let wait = 0;
  const diceEvent = events.find(
    (event): event is Extract<GameEvent, { type: "DICE_ROLLED" }> =>
      event.type === "DICE_ROLLED",
  );
  const sentToJail = events.some((event) => event.type === "SENT_TO_JAIL");
  const cardApplied = events.find(
    (event): event is Extract<GameEvent, { type: "CARD_APPLIED" }> =>
      event.type === "CARD_APPLIED",
  );

  if (diceEvent) {
    wait +=
      DICE_ANIMATION_MS + hopAnimationMs(diceEvent.dice[0] + diceEvent.dice[1]);
    if (sentToJail) {
      wait += slideAnimationMs(MAX_JAIL_SLIDE_HOPS);
    }
  }

  if (cardApplied) {
    const deck = cardApplied.cardId.startsWith("cc_")
      ? "community_chest"
      : "chance";
    const card = lookupCard(deck, cardApplied.cardId);
    if (
      card &&
      !(diceEvent && sentToJail && card.effect.kind === "go_to_jail")
    ) {
      wait += cardAnimationMs(cardApplied);
    }
  }

  if (wait > 0) wait += ANIMATION_SETTLE_MS;
  return wait;
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

    // NOTE: CARD_DRAWN — wait out land animation, post-land beat, then hold card on-screen.
    const revealPause =
      state.phase === "CARD_DRAWN"
        ? POST_LAND_CARD_PAUSE_MS + CARD_REVEAL_PAUSE_MS
        : 0;
    const delay = thinkingDelayMs() + animationWaitMs(events) + revealPause;
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
