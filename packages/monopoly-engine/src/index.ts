import { checkBankruptcy } from "./bankruptcy.js";
import {
  BANK_HOTEL_LIMIT,
  BANK_HOUSE_LIMIT,
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
  GO_TO_JAIL_POSITION,
  JAIL_POSITION,
  TILE_BY_POSITION,
} from "./config/board.js";
import { diceSum, rollDice } from "./dice.js";
import { applyMove } from "./movement.js";
import { buyProperty, canBuyProperty } from "./property.js";
import { chargeRent } from "./rent.js";
import { advanceTurn, getActivePlayer } from "./turn.js";
import type {
  ApplyResult,
  GameAction,
  GameConfig,
  GameEvent,
  GameState,
  PlayerConfig,
  PlayerState,
  RNG,
} from "./types.js";
import { DEFAULT_GAME_CONFIG } from "./types.js";
import { checkWinCondition } from "./win.js";

function shuffleDeck(cards: readonly string[], rng: RNG): string[] {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createInitialState(
  gameId: string,
  players: PlayerConfig[],
  config: Partial<GameConfig> = {},
  rng: RNG = Math.random,
): GameState {
  const finalConfig = { ...DEFAULT_GAME_CONFIG, ...config };

  const playerStates = players.reduce(
    (acc, p) => {
      acc[p.id] = {
        id: p.id,
        name: p.name,
        token: p.token,
        position: 0,
        cash: finalConfig.startingCash,
        ownedPositions: [],
        houses: {},
        hotels: {},
        mortgaged: [],
        isInJail: false,
        jailState: null,
        isBankrupt: false,
        goojfCards: 0,
      };
      return acc;
    },
    {} as Record<string, PlayerState>,
  );

  return {
    gameId,
    phase: "PRE_ROLL",
    turnOrder: players.map((p) => p.id),
    activePlayerIndex: 0,
    players: playerStates,
    lastDice: null,
    doublesCount: 0,
    ownership: {},
    bankHouses: BANK_HOUSE_LIMIT,
    bankHotels: BANK_HOTEL_LIMIT,
    freeParkingPool: 0,
    chanceDeck: {
      drawPile: shuffleDeck(
        CHANCE_CARDS.map((c) => c.id),
        rng,
      ),
      discardPile: [],
    },
    communityChestDeck: {
      drawPile: shuffleDeck(
        COMMUNITY_CHEST_CARDS.map((c) => c.id),
        rng,
      ),
      discardPile: [],
    },
    pendingCard: null,
    config: finalConfig,
    winnerId: null,
    startedAt: new Date().toISOString(),
  };
}

export function applyAction(
  state: GameState,
  action: GameAction,
  rng: RNG = Math.random,
): ApplyResult {
  const activePlayerId = getActivePlayer(state);
  if (!activePlayerId) {
    return { state, events: [], error: "No active player" };
  }

  const events: GameEvent[] = [];

  try {
    switch (action.type) {
      case "ROLL_DICE": {
        if (state.phase !== "PRE_ROLL") {
          return { state, events: [], error: "Cannot roll dice now" };
        }

        const { dice, isDoubles } = rollDice(rng);
        const spaces = diceSum(dice);

        state.lastDice = dice;

        if (isDoubles) {
          state.doublesCount++;
          if (state.doublesCount === 3) {
            const player = state.players[activePlayerId];
            player.position = JAIL_POSITION;
            player.isInJail = true;
            player.jailState = {
              turnsInJail: 0,
              hasGetOutOfJailFreeCard: false,
            };
            state.doublesCount = 0;

            events.push({ type: "SENT_TO_JAIL", playerId: activePlayerId });
            events.push({
              type: "DICE_ROLLED",
              playerId: activePlayerId,
              dice,
              newPosition: JAIL_POSITION,
            });

            state.phase = "END_TURN";
            return { state, events };
          }
        }

        const moveEvents = applyMove(state, activePlayerId, spaces);
        events.push(...moveEvents);

        const player = state.players[activePlayerId];
        events.push({
          type: "DICE_ROLLED",
          playerId: activePlayerId,
          dice,
          newPosition: player.position,
        });

        if (player.position === GO_TO_JAIL_POSITION) {
          player.position = JAIL_POSITION;
          player.isInJail = true;
          player.jailState = { turnsInJail: 0, hasGetOutOfJailFreeCard: false };
          events.push({ type: "SENT_TO_JAIL", playerId: activePlayerId });
          state.phase = "END_TURN";
          return { state, events };
        }

        const tile = TILE_BY_POSITION.get(player.position);
        if (tile?.type === "tax") {
          player.cash -= tile.amount;
          events.push({
            type: "TAX_PAID",
            playerId: activePlayerId,
            amount: tile.amount,
          });

          const bankruptEvents = checkBankruptcy(state, activePlayerId, null);
          events.push(...bankruptEvents);

          const winEvents = checkWinCondition(state);
          events.push(...winEvents);

          if (state.winnerId !== null) {
            return { state, events };
          }

          state.phase = isDoubles ? "PRE_ROLL" : "END_TURN";
          return { state, events };
        }

        const ownership = state.ownership[player.position];
        if (ownership && ownership.ownerId !== activePlayerId) {
          const rentEvents = chargeRent(
            state,
            activePlayerId,
            ownership.ownerId,
            player.position,
            spaces,
          );
          events.push(...rentEvents);

          const bankruptEvents = checkBankruptcy(
            state,
            activePlayerId,
            ownership.ownerId,
          );
          events.push(...bankruptEvents);

          const winEvents = checkWinCondition(state);
          events.push(...winEvents);

          if (state.winnerId !== null) {
            return { state, events };
          }

          state.phase = isDoubles ? "PRE_ROLL" : "END_TURN";
          return { state, events };
        }

        if (
          tile &&
          (tile.type === "property" ||
            tile.type === "railroad" ||
            tile.type === "utility") &&
          !ownership
        ) {
          state.phase = "BUY_OR_DECLINE";
          return { state, events };
        }

        state.phase = isDoubles ? "PRE_ROLL" : "END_TURN";
        return { state, events };
      }

      case "BUY_PROPERTY": {
        if (state.phase !== "BUY_OR_DECLINE") {
          return { state, events: [], error: "Cannot buy property now" };
        }

        const player = state.players[activePlayerId];
        const { canBuy, reason } = canBuyProperty(
          state,
          activePlayerId,
          player.position,
        );

        if (!canBuy) {
          return { state, events: [], error: reason || "Cannot buy property" };
        }

        const buyEvents = buyProperty(state, activePlayerId, player.position);
        events.push(...buyEvents);

        const isDoubles =
          state.lastDice && state.lastDice[0] === state.lastDice[1];
        state.phase = isDoubles ? "PRE_ROLL" : "END_TURN";

        return { state, events };
      }

      case "DECLINE_PROPERTY": {
        if (state.phase !== "BUY_OR_DECLINE") {
          return { state, events: [], error: "Cannot decline property now" };
        }

        const player = state.players[activePlayerId];
        events.push({
          type: "PROPERTY_DECLINED",
          playerId: activePlayerId,
          position: player.position,
        });

        const isDoubles =
          state.lastDice && state.lastDice[0] === state.lastDice[1];
        state.phase = isDoubles ? "PRE_ROLL" : "END_TURN";

        return { state, events };
      }

      case "END_TURN": {
        if (state.phase !== "END_TURN") {
          return { state, events: [], error: "Cannot end turn now" };
        }

        const turnEvents = advanceTurn(state);
        events.push(...turnEvents);

        return { state, events };
      }

      default:
        return { state, events: [], error: "Unknown action type" };
    }
  } catch (err) {
    return { state, events: [], error: String(err) };
  }
}

export { checkBankruptcy } from "./bankruptcy.js";
export * from "./config/board.js";
export { diceSum, rollDice } from "./dice.js";
export { applyMove, movePlayer, setPlayerPosition } from "./movement.js";
export { buyProperty, canBuyProperty } from "./property.js";
export { calculateRent, chargeRent, ownsColorGroup } from "./rent.js";
export { advanceTurn, getActivePlayer } from "./turn.js";
export * from "./types.js";
export { checkWinCondition, getWinner } from "./win.js";
