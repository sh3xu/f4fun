import type { ColorGroup } from "./config/board.js";

export type RNG = () => number;

export type PlayerId = string;

export interface JailState {
  turnsInJail: number;
  hasGetOutOfJailFreeCard: boolean;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  position: number;
  cash: number;
  ownedPositions: number[];
  houses: Record<number, number>;
  hotels: Record<number, number>;
  mortgaged: number[];
  isInJail: boolean;
  jailState: JailState | null;
  isBankrupt: boolean;
  token: string;
  goojfCards: number;
}

export type GamePhase =
  | "WAITING"
  | "PRE_ROLL"
  | "JAIL_DECISION"
  | "POST_ROLL"
  | "BUY_OR_DECLINE"
  | "CARD_DRAWN"
  | "POST_BUY"
  | "AUCTION"
  | "END_TURN"
  | "GAME_OVER";

export interface PropertyOwnership {
  ownerId: PlayerId;
  isMortgaged: boolean;
}

export interface DeckState {
  drawPile: string[];
  discardPile: string[];
}

export interface PendingCard {
  deck: "chance" | "community_chest";
  cardId: string;
}

export interface AuctionState {
  position: number;
  kind: "bank" | "owner";
  sellerId: PlayerId | null;
  highBid: number;
  highBidderId: PlayerId | null;
  bidderOrder: PlayerId[];
  currentBidderIndex: number;
  minNextBid: number;
  /** Phase to restore if auction cancels with no bids. */
  resumePhase: "PRE_ROLL" | "END_TURN";
}

export interface TradeOffer {
  cash: number;
  positions: number[];
  goojfCards: number;
}

export interface PendingTrade {
  tradeId: string;
  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  offer: TradeOffer;
  request: TradeOffer;
}

export interface GameConfig {
  startingCash: number;
  freeParkingJackpot: boolean;
  disconnectGraceSecs: number;
  maxPlayers: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  startingCash: 1500,
  freeParkingJackpot: false,
  disconnectGraceSecs: 60,
  maxPlayers: 8,
};

export interface GameState {
  gameId: string;
  phase: GamePhase;
  turnOrder: PlayerId[];
  activePlayerIndex: number;
  players: Record<PlayerId, PlayerState>;
  lastDice: [number, number] | null;
  doublesCount: number;
  ownership: Record<number, PropertyOwnership>;
  bankHouses: number;
  bankHotels: number;
  freeParkingPool: number;
  chanceDeck: DeckState;
  communityChestDeck: DeckState;
  pendingCard: PendingCard | null;
  auction: AuctionState | null;
  pendingTrades: PendingTrade[];
  config: GameConfig;
  winnerId: PlayerId | null;
  startedAt: string;
}

export type GameAction =
  | { type: "ROLL_DICE" }
  | { type: "BUY_PROPERTY" }
  | { type: "DECLINE_PROPERTY" }
  | { type: "END_TURN" }
  | { type: "PAY_JAIL_FINE" }
  | { type: "USE_GOOJF_CARD" }
  | { type: "ROLL_FOR_JAIL" }
  | { type: "ACKNOWLEDGE_CARD" }
  | { type: "START_AUCTION" }
  | { type: "START_OWNER_AUCTION"; position: number }
  | { type: "PLACE_BID"; amount: number }
  | { type: "PASS_AUCTION" }
  | { type: "BUILD_HOUSE"; position: number }
  | { type: "SELL_HOUSE"; position: number }
  | { type: "BUILD_HOTEL"; position: number }
  | { type: "SELL_HOTEL"; position: number }
  | { type: "MORTGAGE_PROPERTY"; position: number }
  | { type: "UNMORTGAGE_PROPERTY"; position: number }
  | {
      type: "PROPOSE_TRADE";
      tradeId: string;
      toPlayerId: PlayerId;
      offer: TradeOffer;
      request: TradeOffer;
    }
  | { type: "ACCEPT_TRADE"; tradeId: string }
  | { type: "REJECT_TRADE"; tradeId: string };

export type GameEvent =
  | {
      type: "DICE_ROLLED";
      playerId: PlayerId;
      dice: [number, number];
      newPosition: number;
    }
  | { type: "PASSED_GO"; playerId: PlayerId; amount: number }
  | {
      type: "PROPERTY_BOUGHT";
      playerId: PlayerId;
      position: number;
      price: number;
    }
  | { type: "PROPERTY_DECLINED"; playerId: PlayerId; position: number }
  | {
      type: "RENT_PAID";
      payerId: PlayerId;
      ownerId: PlayerId;
      position: number;
      amount: number;
    }
  | { type: "TAX_PAID"; playerId: PlayerId; amount: number }
  | { type: "SENT_TO_JAIL"; playerId: PlayerId }
  | {
      type: "RELEASED_FROM_JAIL";
      playerId: PlayerId;
      method: "fine" | "card" | "doubles";
    }
  | { type: "JAIL_TURN_FAILED"; playerId: PlayerId; turnsInJail: number }
  | {
      type: "CARD_DRAWN";
      playerId: PlayerId;
      deck: "chance" | "community_chest";
      cardId: string;
    }
  | { type: "CARD_APPLIED"; playerId: PlayerId; cardId: string }
  | { type: "HOUSE_BUILT"; playerId: PlayerId; position: number }
  | { type: "HOTEL_BUILT"; playerId: PlayerId; position: number }
  | { type: "HOUSE_SOLD"; playerId: PlayerId; position: number }
  | { type: "HOTEL_SOLD"; playerId: PlayerId; position: number }
  | {
      type: "PROPERTY_MORTGAGED";
      playerId: PlayerId;
      position: number;
      mortgageValue: number;
    }
  | {
      type: "PROPERTY_UNMORTGAGED";
      playerId: PlayerId;
      position: number;
      cost: number;
    }
  | {
      type: "TRADE_PROPOSED";
      tradeId: string;
      fromPlayerId: PlayerId;
      toPlayerId: PlayerId;
    }
  | { type: "TRADE_REJECTED"; tradeId: string }
  | { type: "TRADE_COMPLETED"; initiatorId: PlayerId; partnerId: PlayerId }
  | {
      type: "AUCTION_STARTED";
      position: number;
      kind: "bank" | "owner";
      sellerId: PlayerId | null;
    }
  | { type: "AUCTION_BID"; playerId: PlayerId; amount: number }
  | { type: "AUCTION_PASSED"; playerId: PlayerId }
  | { type: "AUCTION_AUTOFOLDED"; playerId: PlayerId }
  | {
      type: "AUCTION_WON";
      playerId: PlayerId;
      position: number;
      amount: number;
    }
  | { type: "AUCTION_CANCELLED"; position: number }
  | { type: "PLAYER_BANKRUPT"; playerId: PlayerId; creditorId: PlayerId | null }
  | { type: "TURN_ADVANCED"; playerId: PlayerId }
  | { type: "GAME_WON"; winnerId: PlayerId };

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
  error?: string;
}

export interface PlayerConfig {
  id: PlayerId;
  name: string;
  token: string;
}

export type { ColorGroup };
