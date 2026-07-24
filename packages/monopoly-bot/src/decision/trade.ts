import {
  buildingsBlockDeedAction,
  type GameAction,
  isActionDeadlineExpired,
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
  valuePropertyAt,
} from "../valuation/propertyValue.js";
import { wouldCompleteOpponentMonopoly } from "./buy.js";
import {
  partnerTradeConditionKey,
  rejectedDealLockKey,
  tradeDealFingerprint,
} from "./tradeFingerprint.js";

const MAX_TRADE_PROPOSALS = 8;

function emptyOffer(): TradeOffer {
  return { cash: 0, positions: [], goojfCards: 0 };
}

function selectOfferPositions(
  ctx: StrategyContext,
  blockedGroup: string,
): number[] {
  const { state, actorId } = ctx;
  const player = state.players[actorId];
  if (!player) return [];

  return [...player.ownedPositions]
    .filter((position) => {
      const tile = TILE_BY_POSITION.get(position);
      if (tile?.type === "property" && tile.colorGroup === blockedGroup) {
        return false;
      }
      // NOTE: Issue #52 — cannot trade a deed while monopoly color-group has buildings.
      return buildingsBlockDeedAction(state, actorId, position) === null;
    })
    .sort(
      (a, b) =>
        valuePropertyAt(state, actorId, a) - valuePropertyAt(state, actorId, b),
    )
    .slice(0, 1);
}

export function generateTradeProposals(ctx: StrategyContext): GameAction[] {
  const { state, actorId, rng, rejectedTradeLocks } = ctx;
  const player = state.players[actorId];
  if (!player || player.isBankrupt) return [];
  // NOTE: Dice-roll phase — roll first; trading waits for END_TURN / jail decision.
  if (state.phase === "PRE_ROLL") {
    return [];
  }
  // NOTE: Issue #55 — no new deals once the turn deadline has elapsed.
  if (isActionDeadlineExpired(state)) {
    return [];
  }

  const proposals: GameAction[] = [];

  for (const opponentId of state.turnOrder) {
    if (opponentId === actorId) continue;
    const opponent = state.players[opponentId];
    if (!opponent || opponent.isBankrupt) continue;

    for (const position of opponent.ownedPositions) {
      const tile = TILE_BY_POSITION.get(position);
      if (tile?.type !== "property") continue;
      // NOTE: Issue #52 — skip requesting deeds blocked by color-group buildings.
      if (buildingsBlockDeedAction(state, opponentId, position) !== null) {
        continue;
      }

      const group = tile.colorGroup;
      const owned = POSITIONS_BY_COLOR.get(group)?.filter(
        (pos) => state.ownership[pos]?.ownerId === actorId,
      );
      if (!owned || owned.length === 0) continue;

      const needValue = valuePositionForBuyer(state, actorId, position);
      const offerCash = Math.min(
        Math.floor(needValue * 0.25),
        Math.max(0, player.cash - 200),
      );

      const offer: TradeOffer = {
        ...emptyOffer(),
        cash: offerCash,
        positions: selectOfferPositions(ctx, group),
      };
      const request: TradeOffer = {
        ...emptyOffer(),
        positions: [position],
      };

      const fingerprint = tradeDealFingerprint(
        actorId,
        opponentId,
        offer,
        request,
      );
      const partnerCondition = partnerTradeConditionKey(state, opponentId);
      // NOTE: Issue #55 — skip deals rejected for this partner's current conditions.
      if (
        rejectedTradeLocks?.has(
          rejectedDealLockKey(fingerprint, partnerCondition),
        )
      ) {
        continue;
      }

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

      let adjustment = 0;
      for (const pos of trade.offer.positions) {
        if (wouldCompleteOpponentMonopoly(state, actorId, pos)) {
          adjustment += 500;
        }
      }
      for (const pos of trade.request.positions) {
        if (wouldCompleteOpponentMonopoly(state, trade.fromPlayerId, pos)) {
          adjustment -= 200;
        }
      }

      const before = playerNetScore(state, actorId);
      const simulated = simulateAction(state, action, rng, actorId);
      const after = simulated.error
        ? before
        : playerNetScore(simulated.state, actorId);
      const delta = after - before + adjustment;

      options.push({
        action,
        score: delta >= 0 ? Math.max(delta, 50) : delta,
        reasoning:
          delta >= 0
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
  const phase = state.phase;
  // NOTE: PRE_ROLL is roll-only for bots — no new trade offers during dice phase.
  if (phase === "PRE_ROLL") {
    return [];
  }
  const tradeWindow = phase === "END_TURN" || phase === "JAIL_DECISION";

  for (const action of proposals) {
    if (action.type !== "PROPOSE_TRADE") continue;
    const fingerprint = tradeDealFingerprint(
      actorId,
      action.toPlayerId,
      action.offer,
      action.request,
    );
    const partnerCondition = partnerTradeConditionKey(state, action.toPlayerId);
    if (
      ctx.rejectedTradeLocks?.has(
        rejectedDealLockKey(fingerprint, partnerCondition),
      )
    ) {
      continue;
    }

    const before = playerNetScore(state, actorId);
    const proposed = simulateAction(state, action, rng, actorId);
    if (proposed.error) continue;
    const accepted = simulateAction(
      proposed.state,
      { type: "ACCEPT_TRADE", tradeId: action.tradeId },
      rng,
      action.toPlayerId,
    );
    if (accepted.error) continue;
    const after = playerNetScore(accepted.state, actorId);
    const delta = after - before;

    const pos = action.request.positions[0];
    const tile = pos !== undefined ? TILE_BY_POSITION.get(pos) : null;
    const completesMonopoly =
      tile?.type === "property" &&
      (() => {
        const groupPositions = POSITIONS_BY_COLOR.get(tile.colorGroup) ?? [];
        return (
          groupPositions.length > 0 &&
          groupPositions.every(
            (p) => accepted.state.ownership[p]?.ownerId === actorId,
          )
        );
      })();

    if (!completesMonopoly && delta <= 50) continue;
    // NOTE: Monopoly completions are worth proposing even when cash offered
    // makes the immediate net score flat — buildings unlock after.
    if (completesMonopoly && delta < -100) continue;

    // NOTE: END_TURN/JAIL must beat END_TURN(600) or trades never fire.
    let score: number;
    if (
      completesMonopoly &&
      (phase === "END_TURN" || phase === "JAIL_DECISION")
    ) {
      score = Math.min(650 + Math.floor(delta / 10), 900);
    } else if (tradeWindow) {
      score = Math.min(delta + 120, 640);
    } else {
      score = Math.min(delta + 50, 400);
    }

    options.push({
      action,
      score,
      reasoning: completesMonopoly
        ? `Propose trade for ${tile?.name ?? "property"} — completes monopoly`
        : `Propose trade for ${tile?.name ?? "property"} — improves position`,
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
