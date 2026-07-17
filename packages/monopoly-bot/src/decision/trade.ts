import {
  type GameAction,
  type ownsColorGroup,
  POSITIONS_BY_COLOR,
  simulateAction,
  TILE_BY_POSITION,
  type TradeOffer,
} from "@f4fun/monopoly-engine";
import type { StrategyContext } from "../strategy/types.js";
import {
  playerNetScore,
  valuePositionForBuyer,
} from "../valuation/propertyValue.js";
import { wouldCompleteOpponentMonopoly } from "./buy.js";

const MAX_TRADE_PROPOSALS = 8;

function emptyOffer(): TradeOffer {
  return { cash: 0, positions: [], goojfCards: 0 };
}

export function generateTradeProposals(ctx: StrategyContext): GameAction[] {
  const { state, actorId, rng } = ctx;
  const player = state.players[actorId];
  if (!player || player.isBankrupt) return [];

  const proposals: GameAction[] = [];

  for (const opponentId of state.turnOrder) {
    if (opponentId === actorId) continue;
    const opponent = state.players[opponentId];
    if (!opponent || opponent.isBankrupt) continue;

    for (const position of opponent.ownedPositions) {
      const tile = TILE_BY_POSITION.get(position);
      if (tile?.type !== "property") continue;

      const group = tile.colorGroup;
      const owned = POSITIONS_BY_COLOR.get(group)?.filter(
        (pos) => state.ownership[pos]?.ownerId === actorId,
      );
      if (!owned || owned.length === 0) continue;

      const needValue = valuePositionForBuyer(state, actorId, position);
      const offerCash = Math.min(
        Math.floor(needValue * 0.15),
        Math.max(0, player.cash - 200),
      );

      const offer: TradeOffer = {
        ...emptyOffer(),
        cash: offerCash,
        positions: owned.slice(0, 1),
      };
      const request: TradeOffer = {
        ...emptyOffer(),
        positions: [position],
      };

      const tradeId = `bot-${actorId}-${Date.now()}-${proposals.length}`;
      const action: GameAction = {
        type: "PROPOSE_TRADE",
        tradeId,
        toPlayerId: opponentId,
        offer,
        request,
      };

      const result = simulateAction(state, action, rng, actorId);
      if (!result.error) {
        proposals.push(action);
      }

      if (proposals.length >= MAX_TRADE_PROPOSALS) {
        return proposals;
      }
    }
  }

  return proposals;
}

export function scoreTradeResponse(ctx: StrategyContext): {
  action: GameAction;
  score: number;
  reasoning: string;
}[] {
  const { state, actorId, legalActions, rng } = ctx;
  const options: { action: GameAction; score: number; reasoning: string }[] =
    [];

  for (const action of legalActions) {
    if (action.type === "REJECT_TRADE") {
      options.push({
        action,
        score: 0,
        reasoning: "Reject trade — not enough value",
      });
    }

    if (action.type === "ACCEPT_TRADE") {
      const trade = state.pendingTrades.find(
        (t) => t.tradeId === action.tradeId,
      );
      if (!trade) continue;

      let penalty = 0;
      for (const pos of trade.offer.positions) {
        if (wouldCompleteOpponentMonopoly(state, actorId, pos)) {
          penalty += 500;
        }
      }
      for (const pos of trade.request.positions) {
        if (wouldCompleteOpponentMonopoly(state, trade.fromPlayerId, pos)) {
          penalty -= 200;
        }
      }

      const before = playerNetScore(state, actorId);
      const simulated = simulateAction(state, action, rng, actorId);
      const after = simulated.error
        ? before
        : playerNetScore(simulated.state, actorId);
      const delta = after - before - penalty;

      options.push({
        action,
        score: delta,
        reasoning:
          delta > 0
            ? "Accept trade — improves position"
            : "Reject trade — unfavorable exchange",
      });
    }
  }

  return options;
}

export function scoreTradeProposals(
  ctx: StrategyContext,
  proposals: GameAction[],
): { action: GameAction; score: number; reasoning: string }[] {
  const { state, actorId, rng } = ctx;
  const options: { action: GameAction; score: number; reasoning: string }[] =
    [];

  for (const action of proposals) {
    if (action.type !== "PROPOSE_TRADE") continue;
    const before = playerNetScore(state, actorId);
    const simulated = simulateAction(state, action, rng, actorId);
    if (simulated.error) continue;
    const after = playerNetScore(simulated.state, actorId);
    const delta = after - before;
    if (delta <= 50) continue;

    const pos = action.request.positions[0];
    const tile = pos !== undefined ? TILE_BY_POSITION.get(pos) : null;
    options.push({
      action,
      score: Math.min(delta + 50, 180),
      reasoning: `Propose trade for ${tile?.name ?? "property"} — completes monopoly`,
    });
  }

  return options;
}

export function opponentWouldGainMonopoly(
  state: Parameters<typeof ownsColorGroup>[0],
  fromPlayerId: string,
  positions: number[],
): boolean {
  for (const pos of positions) {
    const tile = TILE_BY_POSITION.get(pos);
    if (tile?.type !== "property") continue;
    const groupPositions = POSITIONS_BY_COLOR.get(tile.colorGroup) ?? [];
    const wouldOwn = groupPositions.filter(
      (p) =>
        state.ownership[p]?.ownerId === fromPlayerId || positions.includes(p),
    ).length;
    if (wouldOwn >= groupPositions.length) return true;
  }
  return false;
}
