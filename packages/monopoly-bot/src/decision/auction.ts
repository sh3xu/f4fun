import { type GameAction, TILE_BY_POSITION } from "@f4fun/monopoly-engine";
import type { StrategyContext } from "../strategy/types.js";
import { minimumCashBuffer } from "../valuation/cashBuffer.js";
import { valuePositionForBuyer } from "../valuation/propertyValue.js";

export function scoreAuctionOptions(ctx: StrategyContext): {
  action: GameAction;
  score: number;
  reasoning: string;
}[] {
  const { state, actorId, legalActions } = ctx;
  const player = state.players[actorId];
  const auction = state.auction;
  if (!player || !auction) return [];

  const tile = TILE_BY_POSITION.get(auction.position);
  const value = valuePositionForBuyer(state, actorId, auction.position);
  const buffer = minimumCashBuffer(ctx);
  const maxBid = Math.min(player.cash - buffer, Math.floor(value * 1.15));

  const options: { action: GameAction; score: number; reasoning: string }[] =
    [];

  for (const action of legalActions) {
    if (action.type === "PASS_AUCTION") {
      options.push({
        action,
        score: 0,
        reasoning: "Pass on auction",
      });
    }

    if (action.type === "PLACE_BID") {
      const score =
        action.amount <= maxBid ? value - action.amount : -1000 - action.amount;
      options.push({
        action,
        score,
        reasoning:
          action.amount <= maxBid
            ? `Bid $${action.amount} on ${tile?.name ?? "property"}`
            : "Bid too high for valuation",
      });
    }
  }

  return options;
}

export function pickBestBid(ctx: StrategyContext): {
  action: GameAction;
  score: number;
  reasoning: string;
} | null {
  const bids = scoreAuctionOptions(ctx).filter(
    (o) => o.action.type === "PLACE_BID" && o.score > 0,
  );
  if (bids.length === 0) return null;
  return bids.reduce((best, cur) => (cur.score > best.score ? cur : best));
}
