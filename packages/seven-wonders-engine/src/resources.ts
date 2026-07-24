import { getCardById } from "./config/cards.js";
import { getWonderById } from "./config/wonders.js";
import type {
  CardColour,
  CardDef,
  CardEffect,
  GameState,
  PlayerState,
  Resource,
  ResourceCost,
} from "./types.js";

const RAW_RESOURCES: readonly Resource[] = [
  "wood",
  "stone",
  "clay",
  "ore",
] as const;

export function isRawResource(r: Resource): boolean {
  return (RAW_RESOURCES as readonly string[]).includes(r);
}

export interface ProductionSource {
  fixed: ResourceCost;
  /** Each entry is one producer: pick at most one resource from the alternatives. */
  choices: Resource[][];
}

export function getPlayerProduction(player: PlayerState): ProductionSource {
  const wonder = getWonderById(player.wonderId);
  const fixed: Record<string, number> = {};
  const choices: Resource[][] = [];

  fixed[wonder.startingResource] = (fixed[wonder.startingResource] ?? 0) + 1;

  for (const cardId of player.tableau) {
    const card = getCardById(cardId);
    addEffectProduction(card.effect, fixed, choices);
  }

  for (let i = 0; i < player.wonderStagesBuilt; i++) {
    const stage = wonder.stages[i];
    if (stage.effect.type === "produce") {
      choices.push(flattenProduceOptions(stage.effect.options));
    } else if (stage.effect.type === "produceAll") {
      for (const [r, amt] of Object.entries(stage.effect.resources)) {
        fixed[r] = (fixed[r] ?? 0) + (amt ?? 0);
      }
    }
  }

  return { fixed: fixed as ResourceCost, choices };
}

function flattenProduceOptions(options: Resource[][]): Resource[] {
  // NOTE: Base-game choice producers are always single-resource alternatives
  // (e.g. Clay Pit: clay OR ore). Multi-resource option bundles are unsupported.
  return options.map((opt) => {
    if (opt.length !== 1) {
      throw new Error(
        `Unsupported multi-resource produce option: [${opt.join(",")}]`,
      );
    }
    return opt[0];
  });
}

function addEffectProduction(
  effect: CardEffect,
  fixed: Record<string, number>,
  choices: Resource[][],
): void {
  if (effect.type === "produceAll") {
    for (const [r, amt] of Object.entries(effect.resources)) {
      fixed[r] = (fixed[r] ?? 0) + (amt ?? 0);
    }
  } else if (effect.type === "produce") {
    if (effect.options.length === 1 && effect.options[0].length === 1) {
      const r = effect.options[0][0];
      fixed[r] = (fixed[r] ?? 0) + 1;
    } else {
      choices.push(flattenProduceOptions(effect.options));
    }
  }
}

export function getNeighborIds(
  state: GameState,
  playerId: string,
): [string, string] {
  const order = state.turnOrder;
  const idx = order.indexOf(playerId);
  const left = order[(idx - 1 + order.length) % order.length];
  const right = order[(idx + 1) % order.length];
  return [left, right];
}

function hasTradingPost(
  player: PlayerState,
  direction: "left" | "right",
  resourceKind: "raw" | "manufactured",
): boolean {
  for (const cardId of player.tableau) {
    const card = getCardById(cardId);
    if (card.effect.type === "tradingPost") {
      const dirMatch =
        card.effect.direction === "both" || card.effect.direction === direction;
      const kindMatch = card.effect.kind === resourceKind;
      if (dirMatch && kindMatch) return true;
    }
  }
  return false;
}

function tradeCostPerResource(
  buyer: PlayerState,
  direction: "left" | "right",
  resource: Resource,
): number {
  const kind = isRawResource(resource) ? "raw" : "manufactured";
  return hasTradingPost(buyer, direction, kind) ? 1 : 2;
}

export interface TradeResult {
  totalCoinCost: number;
  leftCost: number;
  rightCost: number;
}

export function canAfford(
  state: GameState,
  playerId: string,
  cost: ResourceCost,
  coinCost: number,
): TradeResult | null {
  const player = state.players[playerId];
  const [leftId, rightId] = getNeighborIds(state, playerId);
  const leftPlayer = state.players[leftId];
  const rightPlayer = state.players[rightId];

  const ownProd = getPlayerProduction(player);
  const leftProd = getPlayerProduction(leftPlayer);
  const rightProd = getPlayerProduction(rightPlayer);

  const needed: Record<string, number> = {};
  for (const [r, amt] of Object.entries(cost)) {
    if (amt && amt > 0) needed[r] = amt;
  }

  return findCheapestTrade(
    player,
    ownProd,
    leftProd,
    rightProd,
    needed,
    coinCost,
  );
}

function findCheapestTrade(
  buyer: PlayerState,
  ownProd: ProductionSource,
  leftProd: ProductionSource,
  rightProd: ProductionSource,
  needed: Record<string, number>,
  coinCost: number,
): TradeResult | null {
  const remaining = { ...needed };
  for (const [r, amt] of Object.entries(ownProd.fixed)) {
    if (remaining[r]) {
      remaining[r] = Math.max(0, remaining[r] - (amt ?? 0));
      if (remaining[r] === 0) delete remaining[r];
    }
  }

  const choiceOptions = ownProd.choices;
  let bestResult: TradeResult | null = null;

  const tryChoiceCombinations = (
    choiceIdx: number,
    rem: Record<string, number>,
  ): void => {
    if (choiceIdx >= choiceOptions.length) {
      const result = computeNeighborTrade(
        buyer,
        leftProd,
        rightProd,
        rem,
        coinCost,
      );
      if (
        result &&
        (!bestResult || result.totalCoinCost < bestResult.totalCoinCost)
      ) {
        bestResult = result;
      }
      return;
    }

    const options = choiceOptions[choiceIdx];

    // Leave this producer unused for the cost.
    tryChoiceCombinations(choiceIdx + 1, rem);

    for (const resource of options) {
      if (rem[resource] && rem[resource] > 0) {
        const next = { ...rem };
        next[resource]--;
        if (next[resource] === 0) delete next[resource];
        tryChoiceCombinations(choiceIdx + 1, next);
      }
    }
  };

  tryChoiceCombinations(0, remaining);
  return bestResult;
}

function expandChoiceAvailability(
  prod: ProductionSource,
  onAvailable: (available: Record<string, number>) => void,
): void {
  const base: Record<string, number> = {};
  for (const [r, amt] of Object.entries(prod.fixed)) {
    base[r] = amt ?? 0;
  }

  const tryChoices = (
    choiceIdx: number,
    available: Record<string, number>,
  ): void => {
    if (choiceIdx >= prod.choices.length) {
      onAvailable(available);
      return;
    }

    const options = prod.choices[choiceIdx];

    // Neighbor choice unused for this trade.
    tryChoices(choiceIdx + 1, available);

    for (const resource of options) {
      const next = { ...available };
      next[resource] = (next[resource] ?? 0) + 1;
      tryChoices(choiceIdx + 1, next);
    }
  };

  tryChoices(0, base);
}

function computeNeighborTrade(
  buyer: PlayerState,
  leftProd: ProductionSource,
  rightProd: ProductionSource,
  remaining: Record<string, number>,
  coinCost: number,
): TradeResult | null {
  const resourcesNeeded = Object.entries(remaining).filter(
    ([, amt]) => amt > 0,
  );
  if (resourcesNeeded.length === 0) {
    if (buyer.coins >= coinCost) {
      return { totalCoinCost: coinCost, leftCost: 0, rightCost: 0 };
    }
    return null;
  }

  let bestResult: TradeResult | null = null;

  expandChoiceAvailability(leftProd, (leftAvailable) => {
    expandChoiceAvailability(rightProd, (rightAvailable) => {
      const searchTrade = (
        resIdx: number,
        leftUsed: Record<string, number>,
        rightUsed: Record<string, number>,
        leftCost: number,
        rightCost: number,
      ): void => {
        if (resIdx >= resourcesNeeded.length) {
          const total = coinCost + leftCost + rightCost;
          if (total <= buyer.coins) {
            if (!bestResult || total < bestResult.totalCoinCost) {
              bestResult = { totalCoinCost: total, leftCost, rightCost };
            }
          }
          return;
        }

        const [resource, amount] = resourcesNeeded[resIdx];
        const r = resource as Resource;

        distributeTrade(
          r,
          amount,
          leftAvailable,
          rightAvailable,
          leftUsed,
          rightUsed,
          leftCost,
          rightCost,
          buyer,
          resIdx,
          coinCost,
          bestResult,
          searchTrade,
        );
      };

      searchTrade(0, {}, {}, 0, 0);
    });
  });

  return bestResult;
}

function distributeTrade(
  resource: Resource,
  amountLeft: number,
  leftAvailable: Record<string, number>,
  rightAvailable: Record<string, number>,
  leftUsed: Record<string, number>,
  rightUsed: Record<string, number>,
  leftCost: number,
  rightCost: number,
  buyer: PlayerState,
  resIdx: number,
  coinCost: number,
  bestResult: TradeResult | null,
  searchTrade: (
    ri: number,
    lu: Record<string, number>,
    ru: Record<string, number>,
    lc: number,
    rc: number,
  ) => void,
): void {
  const leftRem = (leftAvailable[resource] ?? 0) - (leftUsed[resource] ?? 0);
  const rightRem = (rightAvailable[resource] ?? 0) - (rightUsed[resource] ?? 0);

  const maxFromLeft = Math.min(amountLeft, leftRem);

  for (let fl = 0; fl <= maxFromLeft; fl++) {
    const fromRight = amountLeft - fl;
    if (fromRight > rightRem) continue;

    const costPerLeft = tradeCostPerResource(buyer, "left", resource);
    const costPerRight = tradeCostPerResource(buyer, "right", resource);
    const newLeftCost = leftCost + fl * costPerLeft;
    const newRightCost = rightCost + fromRight * costPerRight;
    const totalSoFar = coinCost + newLeftCost + newRightCost;

    if (bestResult && totalSoFar >= bestResult.totalCoinCost) continue;
    if (totalSoFar > buyer.coins) continue;

    const newLeftUsed = { ...leftUsed };
    const newRightUsed = { ...rightUsed };
    newLeftUsed[resource] = (newLeftUsed[resource] ?? 0) + fl;
    newRightUsed[resource] = (newRightUsed[resource] ?? 0) + fromRight;

    searchTrade(
      resIdx + 1,
      newLeftUsed,
      newRightUsed,
      newLeftCost,
      newRightCost,
    );
  }
}

export function hasChainFrom(player: PlayerState, card: CardDef): boolean {
  if (!card.freeChainFrom || card.freeChainFrom.length === 0) return false;
  const tableauNames = new Set(
    player.tableau.map((id) => getCardById(id).name),
  );
  return card.freeChainFrom.some((name) => tableauNames.has(name));
}

export function countPlayerCards(
  player: PlayerState,
  colour: CardColour,
): number {
  return player.tableau.filter((id) => getCardById(id).colour === colour)
    .length;
}

export function getPlayerShields(player: PlayerState): number {
  let shields = 0;
  for (const cardId of player.tableau) {
    const card = getCardById(cardId);
    if (card.effect.type === "shields") shields += card.effect.amount;
  }
  const wonder = getWonderById(player.wonderId);
  for (let i = 0; i < player.wonderStagesBuilt; i++) {
    const stage = wonder.stages[i];
    if (stage.effect.type === "shields") shields += stage.effect.amount;
  }
  return shields;
}
