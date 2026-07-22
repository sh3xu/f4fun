import {
  applyAction,
  createInitialState,
  type GameState,
  getLegalActions,
} from "@f4fun/monopoly-engine";
import { describe, expect, it } from "vitest";
import {
  adaptiveBidStep,
  chooseAuctionTargetBid,
  computeAuctionMaxBid,
  isEngineLegalAuctionBid,
  scoreAuctionOptions,
} from "../decision/auction.js";
import { BotPlayer } from "../decision/orchestrator.js";
import { expertStrategy } from "../strategy/expertStrategy.js";
import { PERSONALITIES } from "../strategy/personality.js";
import type { StrategyContext } from "../strategy/types.js";

function createAuctionState(position = 1) {
  const state = createInitialState(
    "auction-bot",
    [
      { id: "p1", name: "P1", token: "car" },
      { id: "p2", name: "P2", token: "hat" },
      { id: "p3", name: "P3", token: "dog" },
    ],
    {},
    () => 0.5,
  );
  state.players.p1.position = position;
  state.phase = "BUY_OR_DECLINE";
  state.lastDice = [2, 3];
  applyAction(state, { type: "START_AUCTION" });
  expect(state.auction).not.toBeNull();
  return state;
}

function requireAuction(state: GameState) {
  expect(state.auction).not.toBeNull();
  if (!state.auction) throw new Error("expected auction");
  return state.auction;
}

function ctxFor(
  state: ReturnType<typeof createAuctionState>,
  actorId: string,
  personality = PERSONALITIES.balanced,
  rng: () => number = () => 0.5,
): StrategyContext {
  return {
    state,
    actorId,
    legalActions: getLegalActions(state, actorId),
    rng,
    personality,
  };
}

describe("strategic auction bidding", () => {
  it("values monopoly completion higher than a filler lot", () => {
    const monopolyState = createAuctionState(37);
    monopolyState.ownership[39] = { ownerId: "p1", isMortgaged: false };
    monopolyState.players.p1.ownedPositions = [39];
    const monopolyMax = computeAuctionMaxBid(
      ctxFor(monopolyState, "p1", PERSONALITIES.aggressive),
    );

    const fillerState = createAuctionState(1);
    const fillerMax = computeAuctionMaxBid(
      ctxFor(fillerState, "p1", PERSONALITIES.aggressive),
    );

    expect(monopolyMax).toBeGreaterThan(fillerMax);
  });

  it("passes when cash cannot clear reserve + min bid", () => {
    const state = createAuctionState(39);
    state.players.p1.cash = 100;
    state.players.p1.hotels[1] = 1;
    const auction = requireAuction(state);
    auction.highBid = 80;
    auction.highBidderId = "p2";
    auction.minNextBid = 81;
    auction.currentBidderIndex = 0;

    const options = scoreAuctionOptions(
      ctxFor(state, "p1", PERSONALITIES.conservative),
    );
    expect(options.every((o) => o.action.type === "PASS_AUCTION")).toBe(true);
    expect(chooseAuctionTargetBid(ctxFor(state, "p1"))).toBeNull();
  });

  it("prefers a jump larger than minNextBid when cash allows", () => {
    const state = createAuctionState(19);
    state.players.p1.cash = 1800;
    state.players.p2.cash = 1800;
    state.players.p3.cash = 1800;
    const auction = requireAuction(state);
    auction.minNextBid = 1;

    const target = chooseAuctionTargetBid(
      ctxFor(state, "p1", PERSONALITIES.aggressive, () => 0.6),
    );
    expect(target).not.toBeNull();
    if (target === null) return;
    expect(target).toBeGreaterThan(auction.minNextBid);
  });

  it("denial personality bids more when opponent is one away from monopoly", () => {
    const denied = createAuctionState(3);
    denied.ownership[1] = { ownerId: "p2", isMortgaged: false };
    denied.players.p2.ownedPositions = [1];
    denied.players.p1.cash = 2000;

    const open = createAuctionState(3);
    open.players.p1.cash = 2000;

    const denialMax = computeAuctionMaxBid(
      ctxFor(denied, "p1", PERSONALITIES.denial, () => 0.5),
    );
    const balancedOpen = computeAuctionMaxBid(
      ctxFor(open, "p1", PERSONALITIES.balanced, () => 0.5),
    );

    expect(denialMax).toBeGreaterThan(balancedOpen);
  });

  it("snipes near a cash-poor opponent instead of crawling", () => {
    const state = createAuctionState(19);
    state.players.p1.cash = 1800;
    state.players.p2.cash = 350;
    state.players.p3.cash = 2000;
    const auction = requireAuction(state);
    auction.minNextBid = 50;
    auction.highBid = 49;
    auction.highBidderId = "p3";

    const target = chooseAuctionTargetBid(
      ctxFor(state, "p1", PERSONALITIES.aggressive, () => 0.5),
    );
    expect(target).not.toBeNull();
    if (target === null) return;
    expect(target).toBeGreaterThanOrEqual(300);
    expect(target).toBeLessThanOrEqual(350);
  });

  it("gambler can exceed fair value with seeded high gamble roll", () => {
    const fairRng = () => 0.5;
    const gambleRngValues = [0.5, 0.01, 0.5, 0.5, 0.5, 0.5];
    let i = 0;
    const gambleRng = () => gambleRngValues[i++] ?? 0.5;

    const stateFair = createAuctionState(11);
    stateFair.players.p1.cash = 2000;
    const fair = computeAuctionMaxBid(
      ctxFor(stateFair, "p1", PERSONALITIES.conservative, fairRng),
    );

    const stateGamble = createAuctionState(11);
    stateGamble.players.p1.cash = 2000;
    const gambled = computeAuctionMaxBid(
      ctxFor(stateGamble, "p1", PERSONALITIES.gambler, gambleRng),
    );

    expect(gambled).toBeGreaterThan(fair);
  });

  it("decide accepts PLACE_BID amounts absent from the discrete legal ladder", () => {
    const state = createAuctionState(19);
    state.players.p1.cash = 1800;
    state.players.p2.cash = 1800;
    state.players.p3.cash = 1800;

    const auction = requireAuction(state);
    const legal = getLegalActions(state, "p1");
    const discreteBids = new Set(
      legal
        .filter((a) => a.type === "PLACE_BID")
        .map((a) => (a.type === "PLACE_BID" ? a.amount : -1)),
    );

    const bot = new BotPlayer(expertStrategy, PERSONALITIES.aggressive);
    const decision = bot.decide(state, "p1", legal, () => 0.55);

    expect(decision.action.type).toBe("PLACE_BID");
    if (decision.action.type !== "PLACE_BID") return;
    expect(isEngineLegalAuctionBid(state, "p1", decision.action.amount)).toBe(
      true,
    );
    expect(decision.action.amount).toBeGreaterThan(auction.minNextBid);
    expect(
      discreteBids.has(decision.action.amount) ||
        decision.action.amount > auction.minNextBid + 1,
    ).toBe(true);
  });

  it("adaptive steps grow with bid level", () => {
    expect(adaptiveBidStep(1, 100)).toBe(10);
    expect(adaptiveBidStep(80, 400)).toBe(25);
    expect(adaptiveBidStep(200, 800)).toBe(50);
    expect(adaptiveBidStep(500, 1200)).toBe(100);
  });
});
