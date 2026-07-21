import {
  applyAction,
  createInitialState,
  type GameAction,
  getLegalActions,
} from "@f4fun/monopoly-engine";
import { describe, expect, it } from "vitest";
import {
  scoreBuyOptions,
  wouldCompleteOpponentMonopoly,
} from "../decision/buy.js";
import { scoreJailOptions } from "../decision/jail.js";
import { BotPlayer } from "../decision/orchestrator.js";
import { generateTradeProposals } from "../decision/trade.js";
import {
  partnerTradeConditionKey,
  pendingTradeFingerprint,
  rejectedDealLockKey,
} from "../decision/tradeFingerprint.js";
import { expertStrategy } from "../strategy/expertStrategy.js";
import type { StrategyContext } from "../strategy/types.js";
import { minimumCashBuffer } from "../valuation/cashBuffer.js";
import { valuePositionForBuyer } from "../valuation/propertyValue.js";

function createState() {
  return createInitialState(
    "bot-regression",
    [
      { id: "p1", name: "P1", token: "memo_1" },
      { id: "p2", name: "P2", token: "memo_2" },
    ],
    {},
    () => 0.5,
  );
}

function createCtx(
  legalActions: GameAction[],
  actorId = "p1",
): StrategyContext {
  return {
    state: createState(),
    actorId,
    legalActions,
    rng: () => 0.5,
  };
}

describe("monopoly-bot regressions", () => {
  it("keeps same-color deeds out of monopoly-completing trade offers", () => {
    const state = createState();
    state.phase = "END_TURN";
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[6] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p2", isMortgaged: false };
    state.players.p1.ownedPositions = [1, 6];
    state.players.p2.ownedPositions = [3];

    const proposals = generateTradeProposals({
      state,
      actorId: "p1",
      legalActions: [],
      rng: () => 0.5,
    });
    const offer = proposals.find(
      (action) =>
        action.type === "PROPOSE_TRADE" && action.request.positions.includes(3),
    );

    expect(offer).toBeDefined();
    expect(offer?.type).toBe("PROPOSE_TRADE");
    if (offer?.type !== "PROPOSE_TRADE") return;
    expect(offer.offer.positions).toEqual([6]);
  });

  it("scores generated trade proposals using the accepted transfer state", () => {
    const state = createState();
    state.phase = "END_TURN";
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[6] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p2", isMortgaged: false };
    state.players.p1.ownedPositions = [1, 6];
    state.players.p2.ownedPositions = [3];

    const proposals = generateTradeProposals({
      state,
      actorId: "p1",
      legalActions: [],
      rng: () => 0.5,
    });
    const scored = expertStrategy.scoreOptions({
      state,
      actorId: "p1",
      legalActions: proposals,
      rng: () => 0.5,
    });
    const tradeScore = scored.find(
      (option) => option.action.type === "PROPOSE_TRADE",
    );

    expect(tradeScore?.score).toBeGreaterThan(50);
  });

  it("never re-offers the same rejected trade in a recursion loop", () => {
    const state = createState();
    state.phase = "END_TURN";
    state.activePlayerIndex = 0;
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[6] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p2", isMortgaged: false };
    state.players.p1.ownedPositions = [1, 6];
    state.players.p2.ownedPositions = [3];

    const proposer = new BotPlayer(expertStrategy);
    const rng = () => 0.5;

    const first = proposer.decide(state, "p1", [{ type: "END_TURN" }], rng);
    expect(first.action.type).toBe("PROPOSE_TRADE");
    if (first.action.type !== "PROPOSE_TRADE") return;

    const proposed = applyAction(state, first.action, rng, "p1");
    expect(proposed.error).toBeUndefined();
    Object.assign(state, proposed.state);
    expect(state.pendingTrades).toHaveLength(1);

    const pending = state.pendingTrades[0];
    expect(pending).toBeDefined();
    if (!pending) return;
    const fingerprint = pendingTradeFingerprint(pending);
    const partnerCondition = partnerTradeConditionKey(
      state,
      pending.toPlayerId,
    );

    // Simulate partner declining — same path as server memory stamp.
    const rejected = applyAction(
      state,
      { type: "REJECT_TRADE", tradeId: pending.tradeId },
      rng,
      "p2",
    );
    expect(rejected.error).toBeUndefined();
    Object.assign(state, rejected.state);
    proposer.rememberRejectedTrade(fingerprint, partnerCondition);

    expect(state.pendingTrades).toHaveLength(0);
    expect(state.phase).toBe("END_TURN");

    // Same turn / same partner conditions — must not spam the deal.
    for (let i = 0; i < 12; i++) {
      const next = proposer.decide(state, "p1", [{ type: "END_TURN" }], rng);
      expect(next.action.type).not.toBe("PROPOSE_TRADE");
      expect(next.action.type).toBe("END_TURN");
    }

    expect(proposer.hasRejectedTrade(fingerprint, partnerCondition)).toBe(true);

    const regenerations = generateTradeProposals({
      state,
      actorId: "p1",
      legalActions: [{ type: "END_TURN" }],
      rng,
      rejectedTradeLocks: new Set([
        rejectedDealLockKey(fingerprint, partnerCondition),
      ]),
    });
    expect(regenerations).toHaveLength(0);

    // Partner conditions changed — same deal shape may be reconsidered.
    state.players.p2.cash -= 50;
    const afterPartnerChange = proposer.decide(
      state,
      "p1",
      [{ type: "END_TURN" }],
      rng,
    );
    expect(afterPartnerChange.action.type).toBe("PROPOSE_TRADE");

    // Next turn (PRE_ROLL) clears locks — may offer again based on scoring.
    state.players.p2.cash += 50;
    proposer.rememberRejectedTrade(
      fingerprint,
      partnerTradeConditionKey(state, "p2"),
    );
    state.phase = "PRE_ROLL";
    const nextTurn = proposer.decide(state, "p1", [{ type: "END_TURN" }], rng);
    expect(nextTurn.action.type).toBe("PROPOSE_TRADE");
  });

  it("keeps rejection locks through doubles reroll PRE_ROLL in the same turn", () => {
    const state = createState();
    state.phase = "END_TURN";
    state.activePlayerIndex = 0;
    state.doublesCount = 0;
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[6] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p2", isMortgaged: false };
    state.players.p1.ownedPositions = [1, 6];
    state.players.p2.ownedPositions = [3];

    const proposer = new BotPlayer(expertStrategy);
    const rng = () => 0.5;

    const first = proposer.decide(state, "p1", [{ type: "END_TURN" }], rng);
    expect(first.action.type).toBe("PROPOSE_TRADE");
    if (first.action.type !== "PROPOSE_TRADE") return;

    const proposed = applyAction(state, first.action, rng, "p1");
    Object.assign(state, proposed.state);
    const pending = state.pendingTrades[0];
    expect(pending).toBeDefined();
    if (!pending) return;

    const fingerprint = pendingTradeFingerprint(pending);
    const partnerCondition = partnerTradeConditionKey(
      state,
      pending.toPlayerId,
    );
    proposer.rememberRejectedTrade(fingerprint, partnerCondition);

    state.pendingTrades = [];
    state.phase = "PRE_ROLL";
    state.doublesCount = 1;

    for (let i = 0; i < 6; i++) {
      const next = proposer.decide(state, "p1", [{ type: "ROLL_DICE" }], rng);
      expect(next.action.type).not.toBe("PROPOSE_TRADE");
    }

    expect(proposer.hasRejectedTrade(fingerprint, partnerCondition)).toBe(true);
  });

  it("detects two-property color groups when blocking monopoly gifts", () => {
    const state = createState();
    state.ownership[1] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions = [1];

    expect(wouldCompleteOpponentMonopoly(state, "p2", 3)).toBe(true);
  });

  it("counts hotels in the cash buffer reserve", () => {
    const ctx = createCtx([], "p1");
    ctx.state.players.p1.hotels[39] = 1;

    expect(minimumCashBuffer(ctx)).toBe(165);
  });

  it("values post-transfer monopoly completion and discounts mortgages", () => {
    const state = createState();
    state.ownership[37] = { ownerId: "p1", isMortgaged: false };

    const standalone = valuePositionForBuyer(state, "p2", 37);

    state.ownership[39] = { ownerId: "p2", isMortgaged: false };
    state.players.p1.ownedPositions = [37];
    state.players.p2.ownedPositions = [39];

    const completesSet = valuePositionForBuyer(state, "p2", 37);
    state.ownership[37] = { ownerId: "p1", isMortgaged: true };
    state.players.p1.mortgaged = [37];
    const mortgaged = valuePositionForBuyer(state, "p2", 37);

    expect(completesSet).toBeGreaterThan(standalone);
    expect(mortgaged).toBeLessThan(completesSet);
  });

  it("uses monopoly count rather than raw board score for jail choices", () => {
    const state = createState();
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[5] = { ownerId: "p1", isMortgaged: false };
    state.ownership[6] = { ownerId: "p1", isMortgaged: false };
    state.ownership[11] = { ownerId: "p2", isMortgaged: false };
    state.ownership[12] = { ownerId: "p2", isMortgaged: false };
    state.ownership[13] = { ownerId: "p2", isMortgaged: false };
    state.ownership[14] = { ownerId: "p2", isMortgaged: false };
    state.ownership[15] = { ownerId: "p2", isMortgaged: false };
    state.ownership[16] = { ownerId: "p2", isMortgaged: false };
    state.ownership[18] = { ownerId: "p2", isMortgaged: false };
    state.ownership[19] = { ownerId: "p2", isMortgaged: false };
    state.ownership[21] = { ownerId: "p2", isMortgaged: false };
    state.players.p1.ownedPositions = [1, 5, 6];
    state.players.p1.cash = 1000;
    state.players.p2.ownedPositions = [11, 12, 13, 14, 15, 16, 18, 19, 21];
    state.players.p2.hotels[11] = 1;
    state.players.p2.hotels[13] = 1;
    state.players.p2.hotels[14] = 1;

    const options = scoreJailOptions({
      state,
      actorId: "p1",
      legalActions: [{ type: "PAY_JAIL_FINE" }, { type: "ROLL_FOR_JAIL" }],
      rng: () => 0.5,
    });

    expect(
      options.find((option) => option.action.type === "PAY_JAIL_FINE")?.score,
    ).toBe(80);
    expect(
      options.find((option) => option.action.type === "ROLL_FOR_JAIL")?.score,
    ).toBe(30);
  });

  it("prefers starting an auction when buying would break reserve", () => {
    const state = createState();
    state.players.p1.position = 21;
    state.players.p1.cash = 300;
    state.players.p1.hotels[39] = 1;

    const options = scoreBuyOptions({
      state,
      actorId: "p1",
      legalActions: [
        { type: "BUY_PROPERTY" },
        { type: "DECLINE_PROPERTY" },
        { type: "START_AUCTION" },
      ],
      rng: () => 0.5,
    });

    expect(
      options.find((option) => option.action.type === "START_AUCTION")?.score,
    ).toBeGreaterThan(
      options.find((option) => option.action.type === "DECLINE_PROPERTY")
        ?.score ?? -1,
    );
  });

  it("does not fabricate debt settlement for the wrong actor", () => {
    const state = createState();
    state.phase = "RAISE_CASH";
    state.pendingDebt = { playerId: "p2", creditorId: null };

    const bot = new BotPlayer(expertStrategy);

    expect(() => bot.decide(state, "p1", [], () => 0.5)).toThrow(
      /No legal actions/,
    );
  });

  it("issue #52: never mortgages a bare monopoly deed while siblings have houses", () => {
    const state = createState();
    state.phase = "RAISE_CASH";
    state.pendingDebt = { playerId: "p1", creditorId: null };
    state.players.p1.cash = -50;
    // Dark blue monopoly: Park Place bare, Boardwalk improved
    state.players.p1.ownedPositions = [37, 39];
    state.ownership[37] = { ownerId: "p1", isMortgaged: false };
    state.ownership[39] = { ownerId: "p1", isMortgaged: false };
    state.players.p1.houses[39] = 2;

    const legal = getLegalActions(state, "p1");
    expect(
      legal.some((a) => a.type === "MORTGAGE_PROPERTY" && a.position === 37),
    ).toBe(false);
    expect(
      legal.some((a) => a.type === "SELL_HOUSE" && a.position === 39),
    ).toBe(true);

    const bot = new BotPlayer(expertStrategy);
    const decision = bot.decide(state, "p1", legal, () => 0.5);
    expect(decision.action.type).toBe("SELL_HOUSE");
    expect(
      decision.action.type === "SELL_HOUSE" && decision.action.position,
    ).toBe(39);
  });

  it("issue #52: trade proposals skip deeds blocked by color-group buildings", () => {
    const state = createState();
    state.phase = "END_TURN";
    state.players.p1.ownedPositions = [1, 3, 6];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };
    state.ownership[6] = { ownerId: "p1", isMortgaged: false };
    state.players.p1.houses[3] = 1;
    state.players.p2.ownedPositions = [8];
    state.ownership[8] = { ownerId: "p2", isMortgaged: false };

    const proposals = generateTradeProposals({
      state,
      actorId: "p1",
      legalActions: [],
      rng: () => 0.5,
    });

    for (const action of proposals) {
      if (action.type !== "PROPOSE_TRADE") continue;
      expect(action.offer.positions).not.toContain(1);
      expect(action.offer.positions).not.toContain(3);
    }
  });
});
