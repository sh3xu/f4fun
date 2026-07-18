import {
  BANK_HOTEL_LIMIT,
  BANK_HOUSE_LIMIT,
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
} from "./config/board.js";
import type {
  GameConfig,
  GameState,
  PlayerConfig,
  PlayerState,
  RNG,
} from "./types.js";
import { DEFAULT_GAME_CONFIG } from "./types.js";

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
        goojfCardSources: [],
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
    allowDoublesReroll: true,
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
    auction: null,
    pendingTrades: [],
    pendingDebt: null,
    config: finalConfig,
    winnerId: null,
    startedAt: new Date().toISOString(),
    actionDeadlineAt: null,
    actionDeadlinePausedMs: null,
  };
}

export { applyAction } from "./applyAction.js";
export {
  getCurrentAuctionBidder,
  passAuction,
  placeBid,
  startBankAuction,
  startOwnerAuction,
} from "./auction.js";
export { checkBankruptcy } from "./bankruptcy.js";
export { bankSaleAmount, sellPropertyToBank } from "./bankSale.js";
export {
  buildHotel,
  buildHouse,
  sellHotel,
  sellHouse,
} from "./building.js";
export {
  applyCardEffect,
  drawCardId,
  lookupCard,
  MOVEMENT_EFFECT_KINDS,
} from "./cards.js";
export { cloneState } from "./cloneState.js";
export * from "./config/board.js";
export {
  enterRaiseCashIfNeeded,
  forceSettleDebt,
  tryResolveRaiseCash,
} from "./debt.js";
export { diceSum, rollDice } from "./dice.js";
export type { BoardEvaluation } from "./evaluateBoardState.js";
export { evaluateBoardState } from "./evaluateBoardState.js";
export { payJailFine, rollForJail, spendGoojfCard } from "./jail.js";
export { getLegalActions } from "./legalActions.js";
export { autoLiquidateAssets } from "./liquidate.js";
export { mortgageProperty, unmortgageProperty } from "./mortgage.js";
export { applyMove, movePlayer, setPlayerPosition } from "./movement.js";
export { phaseAfterDiceAction } from "./phase.js";
export { buyProperty, canBuyProperty } from "./property.js";
export { calculateRent, chargeRent, ownsColorGroup } from "./rent.js";
export { resolveLanding } from "./resolveLanding.js";
export { simulateAction } from "./simulateAction.js";
export {
  acceptTrade,
  expiredTradeIds,
  proposeTrade,
  rejectTrade,
} from "./trade.js";
export { advanceTurn, getActivePlayer } from "./turn.js";
export {
  pauseActionDeadline,
  resumeActionDeadline,
  stampActionDeadline,
  timeoutActionForState,
  timeoutSecsForPhase,
} from "./turnTimeout.js";
export * from "./types.js";
export { checkWinCondition, getWinner } from "./win.js";
