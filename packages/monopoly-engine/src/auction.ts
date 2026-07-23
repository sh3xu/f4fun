import { buildingsBlockDeedAction } from "./building.js";
import { TILE_BY_POSITION } from "./config/board.js";
import { phaseAfterDiceAction } from "./phase.js";
import { pauseActionDeadline, resumeActionDeadline } from "./turnTimeout.js";
import type {
  AuctionState,
  GameEvent,
  GamePhase,
  GameState,
  PlayerId,
} from "./types.js";

function captureResumePhase(state: GameState): AuctionState["resumePhase"] {
  const phase = state.phase;
  if (
    phase === "PRE_ROLL" ||
    phase === "END_TURN" ||
    phase === "BUY_OR_DECLINE" ||
    phase === "JAIL_DECISION" ||
    phase === "RAISE_CASH"
  ) {
    return phase;
  }
  return "END_TURN";
}

/**
 * NOTE: After a bank auction awards the deed, do not resume BUY_OR_DECLINE —
 * the buy/skip/auction card would still show for an already-owned tile.
 */
function resumePhaseAfterAuction(
  state: GameState,
  resume: AuctionState["resumePhase"],
  awarded: boolean,
): GamePhase {
  if (awarded && resume === "BUY_OR_DECLINE") {
    return phaseAfterDiceAction(state);
  }
  return resume;
}

function finishAuction(
  state: GameState,
  resume: GamePhase,
  options?: { restoreDeadline?: boolean },
): void {
  state.phase = resume;
  if (options?.restoreDeadline === false) {
    // NOTE: Drop paused buy-phase timer so the server restamps for END_TURN / PRE_ROLL.
    state.actionDeadlinePausedMs = null;
    state.actionDeadlineAt = null;
    return;
  }
  resumeActionDeadline(state);
}

function eligibleBidders(
  state: GameState,
  sellerId: PlayerId | null,
): PlayerId[] {
  return state.turnOrder.filter((id) => {
    const player = state.players[id];
    if (!player || player.isBankrupt) return false;
    if (sellerId !== null && id === sellerId) return false;
    return true;
  });
}

function autofoldBrokeBidders(state: GameState): GameEvent[] {
  const auction = state.auction;
  if (!auction || auction.highBid <= 0) return [];

  const events: GameEvent[] = [];
  const remaining: PlayerId[] = [];
  const currentId = auction.bidderOrder[auction.currentBidderIndex];

  for (const id of auction.bidderOrder) {
    const player = state.players[id];
    // NOTE: Autofold when cash cannot meet/exceed the current high bid.
    if (!player || player.cash < auction.highBid) {
      events.push({ type: "AUCTION_AUTOFOLDED", playerId: id });
      auction.bidHistory.push({
        playerId: id,
        amount: null,
        kind: "autofold",
      });
      continue;
    }
    remaining.push(id);
  }

  auction.bidderOrder = remaining;
  if (remaining.length === 0) {
    auction.currentBidderIndex = 0;
    return events;
  }

  const nextIndex = remaining.indexOf(currentId);
  auction.currentBidderIndex = nextIndex >= 0 ? nextIndex : 0;
  return events;
}

function transferToWinner(
  state: GameState,
  winnerId: PlayerId,
  position: number,
  amount: number,
  sellerId: PlayerId | null,
  preserveMortgage: boolean,
): GameEvent[] {
  const winner = state.players[winnerId];
  if (!winner) return [];

  winner.cash -= amount;

  if (sellerId) {
    const seller = state.players[sellerId];
    if (!seller) return [];
    seller.cash += amount;
    seller.ownedPositions = seller.ownedPositions.filter((p) => p !== position);
    seller.mortgaged = seller.mortgaged.filter((p) => p !== position);
  }

  const wasMortgaged = preserveMortgage
    ? (state.ownership[position]?.isMortgaged ?? false)
    : false;

  winner.ownedPositions.push(position);
  if (wasMortgaged && !winner.mortgaged.includes(position)) {
    winner.mortgaged.push(position);
  }

  state.ownership[position] = {
    ownerId: winnerId,
    isMortgaged: wasMortgaged,
  };

  return [
    {
      type: "AUCTION_WON",
      playerId: winnerId,
      position,
      amount,
    },
  ];
}

function tryResolveAuction(state: GameState): GameEvent[] {
  const auction = state.auction;
  if (!auction) return [];

  const events: GameEvent[] = [];

  // Winner: exactly one bidder left and they hold the high bid.
  if (
    auction.bidderOrder.length === 1 &&
    auction.highBidderId !== null &&
    auction.highBid > 0 &&
    auction.bidderOrder[0] === auction.highBidderId
  ) {
    const winnerId = auction.highBidderId;
    const position = auction.position;
    const amount = auction.highBid;
    const sellerId = auction.sellerId;
    const preserveMortgage = auction.kind === "owner";
    const storedResume = auction.resumePhase;
    const resume = resumePhaseAfterAuction(state, storedResume, true);

    state.auction = null;
    events.push(
      ...transferToWinner(
        state,
        winnerId,
        position,
        amount,
        sellerId,
        preserveMortgage,
      ),
    );
    finishAuction(state, resume, {
      restoreDeadline: storedResume === "BUY_OR_DECLINE" ? false : undefined,
    });
    return events;
  }

  // All folded / no one left with a bid.
  if (auction.bidderOrder.length === 0) {
    return cancelOrAward(state, events);
  }

  // Everyone passed before any bid: only highBidder null and all gone via pass.
  if (auction.highBidderId === null && auction.bidderOrder.length === 0) {
    return cancelOrAward(state, events);
  }

  return events;
}

function cancelOrAward(state: GameState, events: GameEvent[]): GameEvent[] {
  const auction = state.auction;
  if (!auction) return events;

  if (auction.highBidderId !== null && auction.highBid > 0) {
    const winnerId = auction.highBidderId;
    const position = auction.position;
    const amount = auction.highBid;
    const sellerId = auction.sellerId;
    const preserveMortgage = auction.kind === "owner";
    const storedResume = auction.resumePhase;
    const resume = resumePhaseAfterAuction(state, storedResume, true);

    state.auction = null;
    events.push(
      ...transferToWinner(
        state,
        winnerId,
        position,
        amount,
        sellerId,
        preserveMortgage,
      ),
    );
    finishAuction(state, resume, {
      restoreDeadline: storedResume === "BUY_OR_DECLINE" ? false : undefined,
    });
    return events;
  }

  const position = auction.position;
  const resume = auction.resumePhase;
  state.auction = null;
  events.push({ type: "AUCTION_CANCELLED", position });
  finishAuction(state, resume);
  return events;
}

function advanceBidder(auction: AuctionState): void {
  if (auction.bidderOrder.length === 0) return;
  auction.currentBidderIndex =
    (auction.currentBidderIndex + 1) % auction.bidderOrder.length;
}

export function startBankAuction(
  state: GameState,
  position: number,
): { error?: string; events: GameEvent[] } {
  if (state.phase !== "BUY_OR_DECLINE") {
    return { error: "Cannot start auction now", events: [] };
  }

  if (state.ownership[position]) {
    return { error: "Property already owned", events: [] };
  }

  const tile = TILE_BY_POSITION.get(position);
  if (
    !tile ||
    (tile.type !== "property" &&
      tile.type !== "railroad" &&
      tile.type !== "utility")
  ) {
    return { error: "Tile is not auctionable", events: [] };
  }

  const bidders = eligibleBidders(state, null);
  if (bidders.length === 0) {
    return { error: "No eligible bidders", events: [] };
  }

  pauseActionDeadline(state);

  state.auction = {
    position,
    kind: "bank",
    sellerId: null,
    highBid: 0,
    highBidderId: null,
    bidderOrder: bidders,
    currentBidderIndex: 0,
    minNextBid: 1,
    bidHistory: [],
    resumePhase: captureResumePhase(state),
  };
  state.phase = "AUCTION";

  return {
    events: [
      {
        type: "AUCTION_STARTED",
        position,
        kind: "bank",
        sellerId: null,
      },
    ],
  };
}

export function startOwnerAuction(
  state: GameState,
  sellerId: PlayerId,
  position: number,
): { error?: string; events: GameEvent[] } {
  if (
    state.phase !== "PRE_ROLL" &&
    state.phase !== "END_TURN" &&
    state.phase !== "RAISE_CASH" &&
    state.phase !== "JAIL_DECISION"
  ) {
    return { error: "Cannot start owner auction now", events: [] };
  }

  const ownership = state.ownership[position];
  if (!ownership || ownership.ownerId !== sellerId) {
    return { error: "You do not own this property", events: [] };
  }

  const buildingsError = buildingsBlockDeedAction(state, sellerId, position);
  if (buildingsError) {
    return { error: buildingsError, events: [] };
  }

  const bidders = eligibleBidders(state, sellerId);
  if (bidders.length === 0) {
    return { error: "No eligible bidders", events: [] };
  }

  const resumePhase = captureResumePhase(state);

  pauseActionDeadline(state);

  state.auction = {
    position,
    kind: "owner",
    sellerId,
    highBid: 0,
    highBidderId: null,
    bidderOrder: bidders,
    currentBidderIndex: 0,
    minNextBid: 1,
    bidHistory: [],
    resumePhase,
  };
  state.phase = "AUCTION";

  return {
    events: [
      {
        type: "AUCTION_STARTED",
        position,
        kind: "owner",
        sellerId,
      },
    ],
  };
}

export function placeBid(
  state: GameState,
  playerId: PlayerId,
  amount: number,
): { error?: string; events: GameEvent[] } {
  if (state.phase !== "AUCTION" || !state.auction) {
    return { error: "No active auction", events: [] };
  }

  const auction = state.auction;
  const currentId = auction.bidderOrder[auction.currentBidderIndex];
  if (currentId !== playerId) {
    return { error: "Not your turn to bid", events: [] };
  }

  if (auction.sellerId === playerId) {
    return { error: "Seller cannot bid", events: [] };
  }

  const player = state.players[playerId];
  if (!player || player.isBankrupt) {
    return { error: "Player cannot bid", events: [] };
  }

  if (amount < auction.minNextBid) {
    return { error: `Bid must be at least $${auction.minNextBid}`, events: [] };
  }

  if (amount > player.cash) {
    return { error: "Insufficient funds", events: [] };
  }

  auction.highBid = amount;
  auction.highBidderId = playerId;
  auction.minNextBid = amount + 1;
  auction.bidHistory.push({ playerId, amount, kind: "bid" });

  const events: GameEvent[] = [{ type: "AUCTION_BID", playerId, amount }];

  events.push(...autofoldBrokeBidders(state));

  // After bidding, advance to next remaining bidder (if any besides high bidder alone).
  if (state.auction && state.auction.bidderOrder.length > 1) {
    advanceBidder(state.auction);
    // Skip if advanced onto the high bidder only when others remain — still their turn in order.
  }

  events.push(...tryResolveAuction(state));

  // If still active and current bidder can't afford min next, autofold them until someone can or resolve.
  while (
    state.auction &&
    state.auction.bidderOrder.length > 0 &&
    state.phase === "AUCTION"
  ) {
    const current = state.auction.bidderOrder[state.auction.currentBidderIndex];
    const p = state.players[current];
    if (p && p.cash >= state.auction.minNextBid) break;

    if (current) {
      events.push({ type: "AUCTION_AUTOFOLDED", playerId: current });
      state.auction.bidHistory.push({
        playerId: current,
        amount: null,
        kind: "autofold",
      });
      state.auction.bidderOrder = state.auction.bidderOrder.filter(
        (id) => id !== current,
      );
      if (state.auction.bidderOrder.length === 0) {
        events.push(...tryResolveAuction(state));
        break;
      }
      state.auction.currentBidderIndex %= state.auction.bidderOrder.length;
    } else {
      break;
    }

    events.push(...tryResolveAuction(state));
    if (!state.auction) break;
  }

  return { events };
}

export function passAuction(
  state: GameState,
  playerId: PlayerId,
): { error?: string; events: GameEvent[] } {
  if (state.phase !== "AUCTION" || !state.auction) {
    return { error: "No active auction", events: [] };
  }

  const auction = state.auction;
  const currentId = auction.bidderOrder[auction.currentBidderIndex];
  if (currentId !== playerId) {
    return { error: "Not your turn to pass", events: [] };
  }

  const events: GameEvent[] = [{ type: "AUCTION_PASSED", playerId }];

  auction.bidHistory.push({ playerId, amount: null, kind: "pass" });
  auction.bidderOrder = auction.bidderOrder.filter((id) => id !== playerId);

  if (auction.bidderOrder.length === 0) {
    events.push(...tryResolveAuction(state));
    return { events };
  }

  auction.currentBidderIndex %= auction.bidderOrder.length;
  events.push(...tryResolveAuction(state));
  return { events };
}

export function getCurrentAuctionBidder(state: GameState): PlayerId | null {
  if (!state.auction || state.auction.bidderOrder.length === 0) return null;
  return state.auction.bidderOrder[state.auction.currentBidderIndex] ?? null;
}
