import {
  applyAction,
  type GameAction,
  type GameEvent,
  type GameState,
  getActivePlayer,
  getCurrentAuctionBidder,
  pauseActionDeadline,
  resumeActionDeadline,
  stampActionDeadline,
  type TradeOffer,
} from "@f4fun/monopoly-engine";
import {
  GameAcceptTradeSchema,
  GameAcknowledgeCardSchema,
  GameBuildHotelSchema,
  GameBuildHouseSchema,
  GameBuyPropertySchema,
  GameDeclinePropertySchema,
  GameEndTurnSchema,
  GameMortgagePropertySchema,
  GamePassAuctionSchema,
  GamePayJailFineSchema,
  GamePlaceBidSchema,
  GameProposeTradeSchema,
  GameRejectTradeSchema,
  GameRollDiceSchema,
  GameRollForJailSchema,
  GameSellHotelSchema,
  GameSellHouseSchema,
  GameStartAuctionSchema,
  GameStartOwnerAuctionSchema,
  GameUnmortgagePropertySchema,
  GameUseGoojfCardSchema,
} from "@f4fun/shared-types";
import type { Server } from "socket.io";
import type { ZodType } from "zod";
import type { SocketWithPlayer } from "../../socket/middleware.js";
import {
  requirePlayer,
  requireRoom,
  validatePayload,
} from "../../socket/middleware.js";
import {
  afterGameStateCommit,
  ensureTradeExpiries,
  mergeGameConfig,
} from "./DeadlineTimers.js";
import { logGameAction } from "./GameEventLogger.js";
import { loadGameByRoomId, saveGame } from "./GameStore.js";
import { withRoomLock } from "./roomMutex.js";

function assertRoomMatch(
  socketRoomId: string,
  payloadRoomId: string,
  callback?: (err: string) => void,
): boolean {
  if (socketRoomId !== payloadRoomId) {
    callback?.("Room mismatch");
    return false;
  }
  return true;
}

/** Backfill fields added after older persisted games. Returns true if mutated. */
function normalizeState(state: GameState): boolean {
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
  mergeGameConfig(state);
  if (ensureTradeExpiries(state)) changed = true;
  return changed;
}

function refreshActionDeadline(
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

type ActionHandlerOptions = {
  requireActiveTurn?: boolean;
  turnCountDelta?: number;
  buildAction: (data: Record<string, unknown>) => GameAction;
  actionName: string;
  onEvents?: (
    io: Server,
    roomId: string,
    events: ReturnType<typeof applyAction>["events"],
  ) => void;
};

function registerIntent(
  io: Server,
  socket: SocketWithPlayer,
  eventName: string,
  schema: ZodType,
  options: ActionHandlerOptions,
): void {
  socket.on(eventName, async (payload, callback) => {
    const data = validatePayload(schema)(payload, callback);
    if (!data) return;

    const playerId = requirePlayer(socket);
    const roomId = requireRoom(socket);
    if (!playerId || !roomId) {
      callback?.("Not authenticated");
      return;
    }
    if (!assertRoomMatch(roomId, data.roomId, callback)) return;

    try {
      await withRoomLock(roomId, async () => {
        const loaded = await loadGameByRoomId(data.roomId);
        if (!loaded) {
          callback?.("Game not found");
          return;
        }
        const backfilled = normalizeState(loaded);
        const state = loaded;

        if (options.requireActiveTurn !== false) {
          const activePlayerId = getActivePlayer(state);
          if (activePlayerId !== playerId) {
            callback?.("Not your turn");
            return;
          }
        }

        const stateBefore = JSON.parse(JSON.stringify(state)) as GameState;
        const action = options.buildAction(data as Record<string, unknown>);
        const result = applyAction(state, action, Math.random, playerId);

        if (result.error) {
          // NOTE: Still persist backfilled expiry stamps if we touched legacy trades.
          if (backfilled) {
            await saveGame(state.gameId, state, 0);
          }
          callback?.(result.error);
          return;
        }

        refreshActionDeadline(stateBefore, result.state, result.events);
        await saveGame(state.gameId, result.state, options.turnCountDelta ?? 0);
        try {
          await logGameAction(
            state.gameId,
            roomId,
            playerId,
            options.actionName,
            stateBefore,
            result.state,
            result.events,
          );
        } catch (logErr) {
          // NOTE: Audit log must not block gameplay after state is already persisted.
          console.error("[GameEventLogger] Failed to log action:", logErr);
        }

        io.to(roomId).emit("game:stateUpdated", {
          state: result.state,
          events: result.events,
        });

        options.onEvents?.(io, roomId, result.events);
        afterGameStateCommit(io, roomId, result.state, result.events);

        callback?.(null, { events: result.events });
      });
    } catch (err) {
      callback?.((err as Error).message);
    }
  });
}

function emitDiceRolledEvents(
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

export function registerMonopolyHandlers(
  io: Server,
  socket: SocketWithPlayer,
): void {
  registerIntent(io, socket, "game:rollDice", GameRollDiceSchema, {
    actionName: "ROLL_DICE",
    buildAction: () => ({ type: "ROLL_DICE" }),
    onEvents: emitDiceRolledEvents,
  });

  registerIntent(io, socket, "game:buyProperty", GameBuyPropertySchema, {
    actionName: "BUY_PROPERTY",
    buildAction: () => ({ type: "BUY_PROPERTY" }),
  });

  registerIntent(
    io,
    socket,
    "game:declineProperty",
    GameDeclinePropertySchema,
    {
      actionName: "DECLINE_PROPERTY",
      buildAction: () => ({ type: "DECLINE_PROPERTY" }),
    },
  );

  registerIntent(io, socket, "game:startAuction", GameStartAuctionSchema, {
    actionName: "START_AUCTION",
    buildAction: () => ({ type: "START_AUCTION" }),
  });

  registerIntent(
    io,
    socket,
    "game:startOwnerAuction",
    GameStartOwnerAuctionSchema,
    {
      actionName: "START_OWNER_AUCTION",
      buildAction: (data) => ({
        type: "START_OWNER_AUCTION",
        position: data.position as number,
      }),
    },
  );

  registerIntent(io, socket, "game:placeBid", GamePlaceBidSchema, {
    requireActiveTurn: false,
    actionName: "PLACE_BID",
    buildAction: (data) => ({
      type: "PLACE_BID",
      amount: data.amount as number,
    }),
  });

  registerIntent(io, socket, "game:passAuction", GamePassAuctionSchema, {
    requireActiveTurn: false,
    actionName: "PASS_AUCTION",
    buildAction: () => ({ type: "PASS_AUCTION" }),
  });

  registerIntent(io, socket, "game:buildHouse", GameBuildHouseSchema, {
    actionName: "BUILD_HOUSE",
    buildAction: (data) => ({
      type: "BUILD_HOUSE",
      position: data.position as number,
    }),
  });

  registerIntent(io, socket, "game:sellHouse", GameSellHouseSchema, {
    actionName: "SELL_HOUSE",
    buildAction: (data) => ({
      type: "SELL_HOUSE",
      position: data.position as number,
    }),
  });

  registerIntent(io, socket, "game:buildHotel", GameBuildHotelSchema, {
    actionName: "BUILD_HOTEL",
    buildAction: (data) => ({
      type: "BUILD_HOTEL",
      position: data.position as number,
    }),
  });

  registerIntent(io, socket, "game:sellHotel", GameSellHotelSchema, {
    actionName: "SELL_HOTEL",
    buildAction: (data) => ({
      type: "SELL_HOTEL",
      position: data.position as number,
    }),
  });

  registerIntent(
    io,
    socket,
    "game:mortgageProperty",
    GameMortgagePropertySchema,
    {
      actionName: "MORTGAGE_PROPERTY",
      buildAction: (data) => ({
        type: "MORTGAGE_PROPERTY",
        position: data.position as number,
      }),
    },
  );

  registerIntent(
    io,
    socket,
    "game:unmortgageProperty",
    GameUnmortgagePropertySchema,
    {
      actionName: "UNMORTGAGE_PROPERTY",
      buildAction: (data) => ({
        type: "UNMORTGAGE_PROPERTY",
        position: data.position as number,
      }),
    },
  );

  registerIntent(io, socket, "game:proposeTrade", GameProposeTradeSchema, {
    actionName: "PROPOSE_TRADE",
    buildAction: (data) => ({
      type: "PROPOSE_TRADE",
      tradeId: data.tradeId as string,
      toPlayerId: data.toPlayerId as string,
      offer: data.offer as TradeOffer,
      request: data.request as TradeOffer,
    }),
  });

  registerIntent(io, socket, "game:acceptTrade", GameAcceptTradeSchema, {
    requireActiveTurn: false,
    actionName: "ACCEPT_TRADE",
    buildAction: (data) => ({
      type: "ACCEPT_TRADE",
      tradeId: data.tradeId as string,
    }),
  });

  registerIntent(io, socket, "game:rejectTrade", GameRejectTradeSchema, {
    requireActiveTurn: false,
    actionName: "REJECT_TRADE",
    buildAction: (data) => ({
      type: "REJECT_TRADE",
      tradeId: data.tradeId as string,
    }),
  });

  registerIntent(io, socket, "game:payJailFine", GamePayJailFineSchema, {
    actionName: "PAY_JAIL_FINE",
    buildAction: () => ({ type: "PAY_JAIL_FINE" }),
  });

  registerIntent(io, socket, "game:useGoojfCard", GameUseGoojfCardSchema, {
    actionName: "USE_GOOJF_CARD",
    buildAction: () => ({ type: "USE_GOOJF_CARD" }),
  });

  registerIntent(
    io,
    socket,
    "game:acknowledgeCard",
    GameAcknowledgeCardSchema,
    {
      actionName: "ACKNOWLEDGE_CARD",
      buildAction: () => ({ type: "ACKNOWLEDGE_CARD" }),
    },
  );

  registerIntent(io, socket, "game:rollForJail", GameRollForJailSchema, {
    actionName: "ROLL_FOR_JAIL",
    buildAction: () => ({ type: "ROLL_FOR_JAIL" }),
    onEvents: emitDiceRolledEvents,
  });

  registerIntent(io, socket, "game:endTurn", GameEndTurnSchema, {
    actionName: "END_TURN",
    turnCountDelta: 1,
    buildAction: () => ({ type: "END_TURN" }),
  });
}
