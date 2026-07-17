import { getCurrentAuctionBidder } from "./auction.js";
import { simulateAction } from "./simulateAction.js";
import { getActivePlayer } from "./turn.js";
import type { GameAction, GameState, PlayerId } from "./types.js";

const MAX_AUCTION_BIDS = 50;

function _managementPhaseOk(phase: GameState["phase"]): boolean {
  return (
    phase === "PRE_ROLL" ||
    phase === "END_TURN" ||
    phase === "JAIL_DECISION" ||
    phase === "RAISE_CASH"
  );
}

function isLegal(
  state: GameState,
  action: GameAction,
  actorId: PlayerId,
): boolean {
  const result = simulateAction(state, action, Math.random, actorId);
  return !result.error;
}

function dedupeActions(actions: GameAction[]): GameAction[] {
  const seen = new Set<string>();
  const out: GameAction[] = [];
  for (const action of actions) {
    const key = JSON.stringify(action);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(action);
  }
  return out;
}

function probeAction(
  state: GameState,
  action: GameAction,
  actorId: PlayerId,
  legal: GameAction[],
): void {
  if (isLegal(state, action, actorId)) {
    legal.push(action);
  }
}

function auctionBidAmounts(minBid: number, maxCash: number): number[] {
  if (maxCash < minBid) return [];
  const range = maxCash - minBid;
  const step = range > 200 ? 10 : 1;
  const amounts: number[] = [];
  for (let amount = minBid; amount <= maxCash; amount += step) {
    amounts.push(amount);
    if (amounts.length >= MAX_AUCTION_BIDS) break;
  }
  if (amounts.length > 0 && amounts[amounts.length - 1] !== maxCash) {
    amounts.push(maxCash);
  }
  return amounts;
}

function managementCandidates(
  state: GameState,
  actorId: PlayerId,
  legal: GameAction[],
): void {
  const player = state.players[actorId];
  if (!player) return;

  for (const position of player.ownedPositions) {
    probeAction(state, { type: "BUILD_HOUSE", position }, actorId, legal);
    probeAction(state, { type: "SELL_HOUSE", position }, actorId, legal);
    probeAction(state, { type: "BUILD_HOTEL", position }, actorId, legal);
    probeAction(state, { type: "SELL_HOTEL", position }, actorId, legal);
    probeAction(state, { type: "MORTGAGE_PROPERTY", position }, actorId, legal);
    probeAction(
      state,
      { type: "UNMORTGAGE_PROPERTY", position },
      actorId,
      legal,
    );
    probeAction(
      state,
      { type: "SELL_PROPERTY_TO_BANK", position },
      actorId,
      legal,
    );
    probeAction(
      state,
      { type: "START_OWNER_AUCTION", position },
      actorId,
      legal,
    );
  }
}

/**
 * List legal actions for a player in the current state.
 * NOTE: PROPOSE_TRADE is excluded — callers generate bounded trade candidates separately.
 */
export function getLegalActions(
  state: GameState,
  actorId: PlayerId,
): GameAction[] {
  if (state.phase === "GAME_OVER" || state.winnerId !== null) {
    return [];
  }

  const player = state.players[actorId];
  if (!player || player.isBankrupt) {
    return [];
  }

  const legal: GameAction[] = [];
  const activePlayerId = getActivePlayer(state);

  if (state.pendingTrades.length > 0) {
    for (const trade of state.pendingTrades) {
      if (trade.toPlayerId === actorId) {
        probeAction(
          state,
          { type: "ACCEPT_TRADE", tradeId: trade.tradeId },
          actorId,
          legal,
        );
        probeAction(
          state,
          { type: "REJECT_TRADE", tradeId: trade.tradeId },
          actorId,
          legal,
        );
      }
    }
    return dedupeActions(legal);
  }

  switch (state.phase) {
    case "PRE_ROLL":
      if (actorId === activePlayerId) {
        probeAction(state, { type: "ROLL_DICE" }, actorId, legal);
        managementCandidates(state, actorId, legal);
      }
      break;

    case "JAIL_DECISION":
      if (actorId === activePlayerId) {
        probeAction(state, { type: "PAY_JAIL_FINE" }, actorId, legal);
        probeAction(state, { type: "USE_GOOJF_CARD" }, actorId, legal);
        probeAction(state, { type: "ROLL_FOR_JAIL" }, actorId, legal);
        managementCandidates(state, actorId, legal);
      }
      break;

    case "BUY_OR_DECLINE":
      if (actorId === activePlayerId) {
        probeAction(state, { type: "BUY_PROPERTY" }, actorId, legal);
        probeAction(state, { type: "DECLINE_PROPERTY" }, actorId, legal);
        probeAction(state, { type: "START_AUCTION" }, actorId, legal);
      }
      break;

    case "CARD_DRAWN":
      if (actorId === activePlayerId) {
        probeAction(state, { type: "ACKNOWLEDGE_CARD" }, actorId, legal);
      }
      break;

    case "END_TURN":
      if (actorId === activePlayerId) {
        probeAction(state, { type: "END_TURN" }, actorId, legal);
        managementCandidates(state, actorId, legal);
      }
      break;

    case "AUCTION": {
      const bidder = getCurrentAuctionBidder(state);
      if (actorId === bidder && state.auction) {
        probeAction(state, { type: "PASS_AUCTION" }, actorId, legal);
        const amounts = auctionBidAmounts(
          state.auction.minNextBid,
          player.cash,
        );
        for (const amount of amounts) {
          probeAction(state, { type: "PLACE_BID", amount }, actorId, legal);
        }
      }
      break;
    }

    case "RAISE_CASH":
      if (actorId === state.pendingDebt?.playerId) {
        managementCandidates(state, actorId, legal);
        probeAction(state, { type: "FORCE_SETTLE_DEBT" }, actorId, legal);
        if (legal.length === 0) {
          legal.push({ type: "FORCE_SETTLE_DEBT" });
        }
      }
      break;

    default:
      break;
  }

  return dedupeActions(legal);
}
