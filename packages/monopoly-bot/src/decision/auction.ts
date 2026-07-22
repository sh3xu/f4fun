import {
  type GameAction,
  type GameState,
  type PlayerId,
  POSITIONS_BY_COLOR,
  type RNG,
  TILE_BY_POSITION,
} from "@f4fun/monopoly-engine";
import { type BotPersonality, PERSONALITIES } from "../strategy/personality.js";
import type { StrategyContext } from "../strategy/types.js";
import { minimumCashBuffer } from "../valuation/cashBuffer.js";
import { LANDING_FREQUENCY_WEIGHT } from "../valuation/monopolyPremium.js";
import {
  countOwnedInGroup,
  valuePositionForBuyer,
} from "../valuation/propertyValue.js";
import { wouldCompleteOpponentMonopoly } from "./buy.js";

/** Opponent cash-reserve guess when we cannot see their strategy. */
const OPPONENT_RESERVE_RATIO = 0.15;
const OPPONENT_RESERVE_FLOOR = 50;

export function isEngineLegalAuctionBid(
  state: GameState,
  actorId: PlayerId,
  amount: number,
): boolean {
  const auction = state.auction;
  const player = state.players[actorId];
  if (!auction || !player) return false;
  if (!Number.isInteger(amount)) return false;
  return amount >= auction.minNextBid && amount <= player.cash;
}

function ownedPropertyCount(state: GameState): number {
  return Object.keys(state.ownership).length;
}

/** Dollar premiums on top of buyer valuation (personality-weighted). */
export function auctionStrategicPremium(
  state: GameState,
  actorId: PlayerId,
  position: number,
  personality: BotPersonality,
): number {
  const tile = TILE_BY_POSITION.get(position);
  let premium = 0;

  if (tile?.type === "property") {
    const groupSize = POSITIONS_BY_COLOR.get(tile.colorGroup)?.length ?? 3;
    const ownership = state.ownership[position];
    const prospectiveOwned =
      countOwnedInGroup(state, actorId, tile.colorGroup) +
      (ownership?.ownerId === actorId ? 0 : 1);

    if (prospectiveOwned >= groupSize) {
      premium += 80 * personality.completionPremium;
    } else if (prospectiveOwned === groupSize - 1) {
      premium += 40 * personality.completionPremium;
    } else if (prospectiveOwned >= 1) {
      // NOTE: Incomplete sets retain trade / block value later.
      premium += 12 * personality.completionPremium;
    }

    if (LANDING_FREQUENCY_WEIGHT[tile.colorGroup] >= 1.2) {
      premium += 30;
    }
  } else if (tile?.type === "railroad") {
    const actor = state.players[actorId];
    const ownedRails =
      actor?.ownedPositions.filter((pos) => {
        const t = TILE_BY_POSITION.get(pos);
        return t?.type === "railroad";
      }).length ?? 0;
    premium += ownedRails * 20;
  }

  for (const opponentId of state.turnOrder) {
    if (opponentId === actorId) continue;
    const opponent = state.players[opponentId];
    if (!opponent || opponent.isBankrupt) continue;
    if (wouldCompleteOpponentMonopoly(state, opponentId, position)) {
      premium += 35 * personality.denialWeight;
    }
  }

  if (ownedPropertyCount(state) < 10) {
    premium += 15;
  }

  return premium;
}

export function computeAuctionMaxBid(ctx: StrategyContext): number {
  const { state, actorId, rng } = ctx;
  const player = state.players[actorId];
  const auction = state.auction;
  if (!player || !auction) return 0;

  const personality = ctx.personality ?? PERSONALITIES.balanced;
  const base = valuePositionForBuyer(state, actorId, auction.position);
  const premium = auctionStrategicPremium(
    state,
    actorId,
    auction.position,
    personality,
  );
  const fair = base + premium;
  const noise = 1 + (rng() - 0.5) * 0.1;
  const propertyValue = Math.floor(fair * personality.overpayMult * noise);

  const buffer = Math.floor(minimumCashBuffer(ctx) * personality.reserveMult);
  let maxBid = Math.min(propertyValue, Math.max(0, player.cash - buffer));

  if (player.cash - buffer < auction.minNextBid) {
    return 0;
  }

  // NOTE: Gambler / rare bluff — spike toward cash ceiling.
  if (rng() < personality.gambleChance) {
    const tile = TILE_BY_POSITION.get(auction.position);
    const face = tile && "price" in tile ? tile.price : 100;
    const spike = Math.floor(maxBid * 1.35 + face * 0.25);
    maxBid = Math.min(
      Math.max(0, player.cash - Math.floor(buffer * 0.5)),
      Math.max(maxBid, spike),
    );
  }

  return Math.max(0, maxBid);
}

function estimateOpponentMax(cash: number, rng: RNG): number {
  const reserve = Math.max(
    OPPONENT_RESERVE_FLOOR,
    Math.floor(cash * OPPONENT_RESERVE_RATIO),
  );
  const noise = Math.floor((rng() - 0.5) * 40);
  return Math.max(0, cash - reserve + noise);
}

export function adaptiveBidStep(minNextBid: number, maxBid: number): number {
  const range = maxBid - minNextBid;
  if (range <= 20) return 5;
  if (minNextBid < 50) return 10;
  if (minNextBid < 150) return 25;
  if (minNextBid < 400) return 50;
  return 100;
}

/**
 * Pick a single strategic jump amount (any engine-legal integer).
 * Returns null when the bot should drop out.
 */
export function chooseAuctionTargetBid(ctx: StrategyContext): number | null {
  const { state, actorId, rng } = ctx;
  const player = state.players[actorId];
  const auction = state.auction;
  if (!player || !auction) return null;

  const personality = ctx.personality ?? PERSONALITIES.balanced;
  const maxBid = computeAuctionMaxBid(ctx);
  const minNext = auction.minNextBid;

  if (minNext > maxBid || minNext > player.cash) {
    return null;
  }

  const hardCap = Math.min(maxBid, player.cash);

  // Knock out cash-poor rivals when we can still stay under our max.
  let bestKnockout: number | null = null;
  for (const rivalId of auction.bidderOrder) {
    if (rivalId === actorId) continue;
    const rival = state.players[rivalId];
    if (!rival || rival.isBankrupt) continue;
    if (rival.cash < minNext || rival.cash > hardCap) continue;

    const estimated = estimateOpponentMax(rival.cash, rng);
    // Jump near their cash; slight underbid only when estimate says they hold reserve.
    const under = Math.max(estimated + 1, rival.cash - 15);
    const knockout = Math.min(
      hardCap,
      Math.max(minNext, Math.min(rival.cash, under)),
    );
    if (bestKnockout === null || knockout < bestKnockout) {
      bestKnockout = knockout;
    }
  }

  if (bestKnockout !== null && bestKnockout >= minNext + 5) {
    return bestKnockout;
  }

  const step = adaptiveBidStep(minNext, hardCap);
  const remaining = hardCap - minNext;
  const aggression = personality.jumpAggressiveness;
  const fraction = 0.12 + aggression * (0.2 + rng() * 0.25);
  const jumpFromRange = Math.floor(remaining * fraction);
  const jumpFromStep = Math.floor(
    step * (0.8 + aggression + rng() * (0.5 + aggression)),
  );
  let target = minNext + Math.max(step, jumpFromRange, jumpFromStep);

  // Occasional larger push toward soft mid-target under max.
  if (rng() < 0.25 + aggression * 0.35) {
    const softTarget =
      minNext + Math.floor(remaining * (0.35 + aggression * 0.3));
    target = Math.max(target, softTarget);
  }

  target = Math.min(hardCap, Math.max(minNext, target));
  return target;
}

export function scoreAuctionOptions(ctx: StrategyContext): {
  action: GameAction;
  score: number;
  reasoning: string;
}[] {
  const { state, actorId } = ctx;
  const player = state.players[actorId];
  const auction = state.auction;
  if (!player || !auction) return [];

  const tile = TILE_BY_POSITION.get(auction.position);
  const name = tile?.name ?? "property";
  const target = chooseAuctionTargetBid(ctx);
  const options: {
    action: GameAction;
    score: number;
    reasoning: string;
  }[] = [];

  if (target === null) {
    options.push({
      action: { type: "PASS_AUCTION" },
      score: 100,
      reasoning: `Pass on ${name} — over max valuation`,
    });
    return options;
  }

  options.push({
    action: { type: "PLACE_BID", amount: target },
    score: 1000,
    reasoning: `Bid $${target} on ${name}`,
  });
  options.push({
    action: { type: "PASS_AUCTION" },
    score: -50,
    reasoning: "Pass on auction",
  });

  return options;
}
