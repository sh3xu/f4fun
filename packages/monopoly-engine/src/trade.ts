import type {
  GameEvent,
  GameState,
  PendingTrade,
  PlayerId,
  TradeOffer,
} from "./types.js";

function validateOfferSide(
  state: GameState,
  playerId: PlayerId,
  offer: TradeOffer,
  label: string,
): string | null {
  const player = state.players[playerId];
  if (!player || player.isBankrupt) return `${label} player not found`;

  if (offer.cash < 0 || offer.goojfCards < 0) {
    return `Invalid ${label} offer amounts`;
  }

  if (player.cash < offer.cash) {
    return `${label} cannot afford cash offer`;
  }

  if (player.goojfCards < offer.goojfCards) {
    return `${label} lacks GOOJF cards`;
  }

  for (const position of offer.positions) {
    const ownership = state.ownership[position];
    if (!ownership || ownership.ownerId !== playerId) {
      return `${label} does not own all offered properties`;
    }
    // NOTE: Trades with buildings on the property are disallowed (must sell first).
    if (
      (player.houses[position] ?? 0) > 0 ||
      (player.hotels[position] ?? 0) > 0
    ) {
      return `${label} must sell buildings before trading property`;
    }
  }

  return null;
}

function transferOffer(
  state: GameState,
  fromId: PlayerId,
  toId: PlayerId,
  offer: TradeOffer,
): void {
  const from = state.players[fromId];
  const to = state.players[toId];
  if (!from || !to) return;

  from.cash -= offer.cash;
  to.cash += offer.cash;

  from.goojfCards -= offer.goojfCards;
  to.goojfCards += offer.goojfCards;

  for (const position of offer.positions) {
    const ownership = state.ownership[position];
    if (!ownership) continue;

    const isMortgaged = ownership.isMortgaged;
    from.ownedPositions = from.ownedPositions.filter((p) => p !== position);
    from.mortgaged = from.mortgaged.filter((p) => p !== position);

    to.ownedPositions.push(position);
    if (isMortgaged && !to.mortgaged.includes(position)) {
      to.mortgaged.push(position);
    }

    ownership.ownerId = toId;
  }
}

export function proposeTrade(
  state: GameState,
  fromPlayerId: PlayerId,
  tradeId: string,
  toPlayerId: PlayerId,
  offer: TradeOffer,
  request: TradeOffer,
): { error?: string; events: GameEvent[] } {
  if (fromPlayerId === toPlayerId) {
    return { error: "Cannot trade with yourself", events: [] };
  }

  if (state.pendingTrades.some((t) => t.tradeId === tradeId)) {
    return { error: "Trade id already exists", events: [] };
  }

  const to = state.players[toPlayerId];
  if (!to || to.isBankrupt) {
    return { error: "Partner not found", events: [] };
  }

  const offerErr = validateOfferSide(state, fromPlayerId, offer, "Initiator");
  if (offerErr) return { error: offerErr, events: [] };

  const requestErr = validateOfferSide(state, toPlayerId, request, "Partner");
  if (requestErr) return { error: requestErr, events: [] };

  const pending: PendingTrade = {
    tradeId,
    fromPlayerId,
    toPlayerId,
    offer,
    request,
  };
  state.pendingTrades.push(pending);

  return {
    events: [
      {
        type: "TRADE_PROPOSED",
        tradeId,
        fromPlayerId,
        toPlayerId,
      },
    ],
  };
}

export function acceptTrade(
  state: GameState,
  actorId: PlayerId,
  tradeId: string,
): { error?: string; events: GameEvent[] } {
  const index = state.pendingTrades.findIndex((t) => t.tradeId === tradeId);
  if (index < 0) return { error: "Trade not found", events: [] };

  const trade = state.pendingTrades[index];
  if (trade.toPlayerId !== actorId) {
    return { error: "Only the recipient can accept", events: [] };
  }

  const offerErr = validateOfferSide(
    state,
    trade.fromPlayerId,
    trade.offer,
    "Initiator",
  );
  if (offerErr) return { error: offerErr, events: [] };

  const requestErr = validateOfferSide(
    state,
    trade.toPlayerId,
    trade.request,
    "Partner",
  );
  if (requestErr) return { error: requestErr, events: [] };

  transferOffer(state, trade.fromPlayerId, trade.toPlayerId, trade.offer);
  transferOffer(state, trade.toPlayerId, trade.fromPlayerId, trade.request);

  state.pendingTrades.splice(index, 1);

  return {
    events: [
      {
        type: "TRADE_COMPLETED",
        initiatorId: trade.fromPlayerId,
        partnerId: trade.toPlayerId,
      },
    ],
  };
}

export function rejectTrade(
  state: GameState,
  actorId: PlayerId,
  tradeId: string,
): { error?: string; events: GameEvent[] } {
  const index = state.pendingTrades.findIndex((t) => t.tradeId === tradeId);
  if (index < 0) return { error: "Trade not found", events: [] };

  const trade = state.pendingTrades[index];
  if (actorId !== trade.toPlayerId && actorId !== trade.fromPlayerId) {
    return { error: "Not a party to this trade", events: [] };
  }

  state.pendingTrades.splice(index, 1);
  return {
    events: [{ type: "TRADE_REJECTED", tradeId }],
  };
}
