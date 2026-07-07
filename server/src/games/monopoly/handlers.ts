import { applyAction, getActivePlayer } from "@f4fun/monopoly-engine";
import {
  GameBuyPropertySchema,
  GameDeclinePropertySchema,
  GameEndTurnSchema,
  GameRollDiceSchema,
} from "@f4fun/shared-types";
import type { Server } from "socket.io";
import type { SocketWithPlayer } from "../../socket/middleware.js";
import {
  requirePlayer,
  requireRoom,
  validatePayload,
} from "../../socket/middleware.js";
import { logGameAction } from "./GameEventLogger.js";
import { loadGameByRoomId, saveGame } from "./GameStore.js";

export function registerMonopolyHandlers(
  io: Server,
  socket: SocketWithPlayer,
): void {
  socket.on("game:rollDice", async (payload, callback) => {
    const data = validatePayload(GameRollDiceSchema)(payload, callback);
    if (!data) return;

    const playerId = requirePlayer(socket);
    const roomId = requireRoom(socket);
    if (!playerId || !roomId) {
      callback?.("Not authenticated");
      return;
    }

    try {
      const state = await loadGameByRoomId(data.roomId);
      if (!state) {
        callback?.("Game not found");
        return;
      }

      const activePlayerId = getActivePlayer(state);
      if (activePlayerId !== playerId) {
        callback?.("Not your turn");
        return;
      }

      const stateBefore = JSON.parse(JSON.stringify(state));
      const result = applyAction(state, { type: "ROLL_DICE" });

      if (result.error) {
        callback?.(result.error);
        return;
      }

      await saveGame(state.gameId, result.state);
      await logGameAction(
        state.gameId,
        roomId,
        playerId,
        "ROLL_DICE",
        stateBefore,
        result.state,
        result.events,
      );

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

      callback?.(null, { events: result.events });
    } catch (err) {
      callback?.((err as Error).message);
    }
  });

  socket.on("game:buyProperty", async (payload, callback) => {
    const data = validatePayload(GameBuyPropertySchema)(payload, callback);
    if (!data) return;

    const playerId = requirePlayer(socket);
    const roomId = requireRoom(socket);
    if (!playerId || !roomId) {
      callback?.("Not authenticated");
      return;
    }

    try {
      const state = await loadGameByRoomId(data.roomId);
      if (!state) {
        callback?.("Game not found");
        return;
      }

      const activePlayerId = getActivePlayer(state);
      if (activePlayerId !== playerId) {
        callback?.("Not your turn");
        return;
      }

      const stateBefore = JSON.parse(JSON.stringify(state));
      const result = applyAction(state, { type: "BUY_PROPERTY" });

      if (result.error) {
        callback?.(result.error);
        return;
      }

      await saveGame(state.gameId, result.state);
      await logGameAction(
        state.gameId,
        roomId,
        playerId,
        "BUY_PROPERTY",
        stateBefore,
        result.state,
        result.events,
      );

      io.to(roomId).emit("game:stateUpdated", {
        state: result.state,
        events: result.events,
      });

      callback?.(null, { events: result.events });
    } catch (err) {
      callback?.((err as Error).message);
    }
  });

  socket.on("game:declineProperty", async (payload, callback) => {
    const data = validatePayload(GameDeclinePropertySchema)(payload, callback);
    if (!data) return;

    const playerId = requirePlayer(socket);
    const roomId = requireRoom(socket);
    if (!playerId || !roomId) {
      callback?.("Not authenticated");
      return;
    }

    try {
      const state = await loadGameByRoomId(data.roomId);
      if (!state) {
        callback?.("Game not found");
        return;
      }

      const activePlayerId = getActivePlayer(state);
      if (activePlayerId !== playerId) {
        callback?.("Not your turn");
        return;
      }

      const stateBefore = JSON.parse(JSON.stringify(state));
      const result = applyAction(state, { type: "DECLINE_PROPERTY" });

      if (result.error) {
        callback?.(result.error);
        return;
      }

      await saveGame(state.gameId, result.state);
      await logGameAction(
        state.gameId,
        roomId,
        playerId,
        "DECLINE_PROPERTY",
        stateBefore,
        result.state,
        result.events,
      );

      io.to(roomId).emit("game:stateUpdated", {
        state: result.state,
        events: result.events,
      });

      callback?.(null, { events: result.events });
    } catch (err) {
      callback?.((err as Error).message);
    }
  });

  socket.on("game:endTurn", async (payload, callback) => {
    const data = validatePayload(GameEndTurnSchema)(payload, callback);
    if (!data) return;

    const playerId = requirePlayer(socket);
    const roomId = requireRoom(socket);
    if (!playerId || !roomId) {
      callback?.("Not authenticated");
      return;
    }

    try {
      const state = await loadGameByRoomId(data.roomId);
      if (!state) {
        callback?.("Game not found");
        return;
      }

      const activePlayerId = getActivePlayer(state);
      if (activePlayerId !== playerId) {
        callback?.("Not your turn");
        return;
      }

      const stateBefore = JSON.parse(JSON.stringify(state));
      const result = applyAction(state, { type: "END_TURN" });

      if (result.error) {
        callback?.(result.error);
        return;
      }

      await saveGame(state.gameId, result.state, 1);
      await logGameAction(
        state.gameId,
        roomId,
        playerId,
        "END_TURN",
        stateBefore,
        result.state,
        result.events,
      );

      io.to(roomId).emit("game:stateUpdated", {
        state: result.state,
        events: result.events,
      });

      callback?.(null, { events: result.events });
    } catch (err) {
      callback?.((err as Error).message);
    }
  });
}
