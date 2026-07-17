import { createInitialState, type GameAction } from "@f4fun/monopoly-engine";
import { describe, expect, it } from "vitest";
import {
  scoreBuyOptions,
  wouldCompleteOpponentMonopoly,
} from "../decision/buy.js";
import { scoreJailOptions } from "../decision/jail.js";
import { BotPlayer } from "../decision/orchestrator.js";
import { generateTradeProposals } from "../decision/trade.js";
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
    const tradeScore = scored.find((option) => option.action === proposals[0]);

    expect(tradeScore?.score).toBeGreaterThan(50);
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
});
