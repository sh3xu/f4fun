import type { GameAction, GameEvent, TradeOffer } from "@f4fun/monopoly-engine";
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
  GameSellPropertyToBankSchema,
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
  emitDiceRolledEvents,
  executeGameIntent,
} from "./executeGameIntent.js";

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

type ActionHandlerOptions = {
  requireActiveTurn?: boolean;
  turnCountDelta?: number;
  buildAction: (data: Record<string, unknown>) => GameAction;
  actionName: string;
  onEvents?: (io: Server, roomId: string, events: readonly GameEvent[]) => void;
};

function registerIntent(
  io: Server,
  socket: SocketWithPlayer,
  eventName: string,
  schema: ZodType<{ roomId: string }>,
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
      const action = options.buildAction(data as Record<string, unknown>);
      const result = await executeGameIntent(io, roomId, playerId, action, {
        requireActiveTurn: options.requireActiveTurn,
        turnCountDelta: options.turnCountDelta,
        actionName: options.actionName,
        onEvents: options.onEvents,
      });

      if (!result.ok) {
        callback?.(result.error);
        return;
      }

      callback?.(null, { events: result.events });
    } catch (err) {
      callback?.((err as Error).message);
    }
  });
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

  registerIntent(
    io,
    socket,
    "game:sellPropertyToBank",
    GameSellPropertyToBankSchema,
    {
      actionName: "SELL_PROPERTY_TO_BANK",
      buildAction: (data) => ({
        type: "SELL_PROPERTY_TO_BANK",
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

export {
  emitDiceRolledEvents,
  executeGameIntent,
} from "./executeGameIntent.js";
