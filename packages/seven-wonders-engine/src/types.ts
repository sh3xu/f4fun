export type Resource =
  | "wood"
  | "stone"
  | "clay"
  | "ore"
  | "glass"
  | "papyrus"
  | "textile";

export type Science = "compass" | "tablet" | "gear" | "wild";

export type CardColour =
  | "brown"
  | "grey"
  | "blue"
  | "yellow"
  | "red"
  | "green"
  | "purple";

export type Phase = "DRAFTING" | "GAME_OVER";

export type PickAction = "PLAY" | "DISCARD" | "STAGE_WONDER";

export type PassDirection = "LEFT" | "RIGHT";

export type RNG = () => number;

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 7;

export interface PlayerConfig {
  id: string;
  name: string;
  token: string;
}

export interface PlayerState {
  id: string;
  name: string;
  token: string;
  coins: number;
  wonderId: string;
  wonderStagesBuilt: number;
  tableau: string[];
  militaryTokens: number[];
}

export interface ScoreBreakdown {
  military: number;
  coins: number;
  wonder: number;
  civilian: number;
  science: number;
  commerce: number;
  guild: number;
  total: number;
}

export interface GameState {
  gameId: string;
  phase: Phase;
  age: 1 | 2 | 3;
  passDirection: PassDirection;
  turnOrder: string[];
  players: Record<string, PlayerState>;
  hands: Record<string, string[]>;
  discardPile: string[];
  pendingPicks: Record<string, { action: PickAction; cardId: string }>;
  ageDecks: [string[], string[], string[]];
  finalScores?: Record<string, ScoreBreakdown>;
}

export interface GameAction {
  type: "SUBMIT_PICK";
  playerId: string;
  action: PickAction;
  cardId: string;
}

export type ResourceCost = Partial<Record<Resource, number>>;

export type GuildScoring =
  | { kind: "countNeighbourCards"; colour: CardColour; perCard: number }
  | { kind: "countNeighbourWonderStages"; perStage: number }
  | { kind: "countOwnCards"; colours: CardColour[]; perCard: number }
  | { kind: "scienceWild" };

export type CardEffect =
  | { type: "produce"; options: Resource[][] }
  | { type: "produceAll"; resources: ResourceCost }
  | { type: "coins"; amount: number }
  | { type: "points"; amount: number }
  | { type: "shields"; amount: number }
  | { type: "science"; symbol: Science }
  | {
      type: "tradingPost";
      direction: "left" | "right" | "both";
      kind: "raw" | "manufactured";
    }
  | {
      type: "coinsFromCards";
      colour: CardColour | "wonderStages";
      self: number;
      neighbors: number;
    }
  | { type: "guild"; scoring: GuildScoring }
  | {
      type: "endGamePoints";
      colour: CardColour | "wonderStages";
      self: number;
      neighbors: number;
    };

export interface CardDef {
  id: string;
  name: string;
  age: 1 | 2 | 3;
  minPlayers: number;
  colour: CardColour;
  cost: { coins?: number; resources?: ResourceCost };
  freeChainFrom?: string[];
  chainTo?: string[];
  effect: CardEffect;
}

export type WonderStageEffect =
  | { type: "points"; amount: number }
  | { type: "coins"; amount: number }
  | { type: "shields"; amount: number }
  | { type: "produce"; options: Resource[][] }
  | { type: "produceAll"; resources: ResourceCost }
  | { type: "science"; symbol: Science }
  | { type: "playDiscarded" }
  | { type: "freeBuild" };

export interface WonderStage {
  cost: ResourceCost;
  effect: WonderStageEffect;
}

export interface WonderDef {
  id: string;
  name: string;
  side: "A";
  startingResource: Resource;
  stages: WonderStage[];
}

export interface GameEvent {
  type: string;
  playerId?: string;
  message: string;
}
