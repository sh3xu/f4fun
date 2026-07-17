import type { GameAction } from "@f4fun/monopoly-engine";
import { scoreAuctionOptions } from "../decision/auction.js";
import { scoreBuildOptions, scoreEndTurn } from "../decision/build.js";
import { scoreBuyOptions } from "../decision/buy.js";
import { scoreJailOptions } from "../decision/jail.js";
import { scoreLiquidationOptions } from "../decision/liquidate.js";
import {
  generateTradeProposals,
  scoreTradeProposals,
  scoreTradeResponse,
} from "../decision/trade.js";
import { minimumCashBuffer } from "../valuation/cashBuffer.js";
import type {
  ScoredOption,
  StrategyContext,
  StrategyProfile,
} from "./types.js";

function defaultScores(ctx: StrategyContext): ScoredOption[] {
  const options: ScoredOption[] = [];

  for (const action of ctx.legalActions) {
    if (action.type === "ROLL_DICE") {
      options.push({
        action,
        score: 500,
        reasoning: "Roll dice",
      });
    }
    if (action.type === "ACKNOWLEDGE_CARD") {
      options.push({
        action,
        score: 500,
        reasoning: "Acknowledge card",
      });
    }
  }

  options.push(...scoreBuyOptions(ctx));
  options.push(...scoreBuildOptions(ctx));
  options.push(...scoreJailOptions(ctx));
  options.push(...scoreAuctionOptions(ctx));
  options.push(...scoreLiquidationOptions(ctx));
  options.push(...scoreTradeResponse(ctx));

  const endTurn = scoreEndTurn(ctx);
  if (endTurn) {
    const bestBuild = options.reduce(
      (max, o) =>
        o.action.type.startsWith("BUILD") ? Math.max(max, o.score) : max,
      0,
    );
    if (ctx.state.phase === "END_TURN") {
      endTurn.score = bestBuild >= 80 ? 100 : 600;
    }
    if (
      ctx.state.phase === "BUY_OR_DECLINE" &&
      options.every((o) => o.action.type !== "BUY_PROPERTY" || o.score < 0)
    ) {
      const decline = ctx.legalActions.find(
        (a) => a.type === "DECLINE_PROPERTY",
      );
      if (decline) {
        options.push({
          action: decline,
          score: 400,
          reasoning: "Decline — preserve cash",
        });
      }
    }
    options.push(endTurn);
  }

  const proposals = ctx.legalActions.some(
    (action) => action.type === "PROPOSE_TRADE",
  )
    ? ctx.legalActions.filter(
        (action): action is GameAction => action.type === "PROPOSE_TRADE",
      )
    : generateTradeProposals(ctx);
  options.push(...scoreTradeProposals(ctx, proposals));

  return options;
}

export const expertStrategy: StrategyProfile = {
  id: "expert",
  minimumCashBuffer,
  generateTradeProposals,
  scoreOptions(ctx: StrategyContext): ScoredOption[] {
    return defaultScores(ctx);
  },
};

export function pickBestOption(
  options: ScoredOption[],
  legalActions: GameAction[],
): ScoredOption | null {
  const legalKeys = new Set(legalActions.map((a) => JSON.stringify(a)));
  const valid = options.filter((o) => legalKeys.has(JSON.stringify(o.action)));
  if (valid.length === 0) return null;
  return valid.reduce((best, cur) => (cur.score > best.score ? cur : best));
}
