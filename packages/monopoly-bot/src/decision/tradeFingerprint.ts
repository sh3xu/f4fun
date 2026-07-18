import type {
  GameState,
  PendingTrade,
  PlayerId,
  TradeOffer,
} from "@f4fun/monopoly-engine";

/** Snapshot of a partner's trade-relevant state (cash + deeds). */
export function partnerTradeConditionKey(
  state: GameState,
  partnerId: PlayerId,
): string {
  const partner = state.players[partnerId];
  if (!partner) return partnerId;
  const positions = [...partner.ownedPositions].sort((a, b) => a - b).join(",");
  return `${partnerId}:${partner.cash}:${positions}`;
}

/** Stable id for a deal shape so bots can refuse to re-offer rejected trades. */
export function tradeDealFingerprint(
  fromPlayerId: string,
  toPlayerId: string,
  offer: TradeOffer,
  request: TradeOffer,
): string {
  const side = (deal: TradeOffer) =>
    [
      deal.cash,
      [...deal.positions].sort((a, b) => a - b).join(","),
      deal.goojfCards,
    ].join(":");
  return `${fromPlayerId}->${toPlayerId}|o:${side(offer)}|r:${side(request)}`;
}

export function pendingTradeFingerprint(trade: PendingTrade): string {
  return tradeDealFingerprint(
    trade.fromPlayerId,
    trade.toPlayerId,
    trade.offer,
    trade.request,
  );
}

/**
 * Compound key: same deal + same partner conditions.
 * NOTE: Next turn clears memory; a changed partner condition also unlocks re-offer.
 */
export function rejectedDealLockKey(
  fingerprint: string,
  partnerCondition: string,
): string {
  return `${fingerprint}::${partnerCondition}`;
}
