import type {
  GameState,
  PendingTrade,
  PlayerId,
  TradeOffer,
} from "@f4fun/monopoly-engine";

/**
 * Coarse partner liquidity bands.
 * NOTE: Issue #55 — only drastic cash shifts (e.g. into low/critical) change the
 * rejection lock; small mid-band ticks must not unlock spam re-offers.
 */
export function partnerCashBand(
  cash: number,
): "critical" | "low" | "ok" | "flush" {
  if (cash < 100) return "critical";
  if (cash < 300) return "low";
  if (cash < 800) return "ok";
  return "flush";
}

/** Snapshot of a partner's trade-relevant state (cash band + deeds). */
export function partnerTradeConditionKey(
  state: GameState,
  partnerId: PlayerId,
): string {
  const partner = state.players[partnerId];
  if (!partner) return partnerId;
  const positions = [...partner.ownedPositions].sort((a, b) => a - b).join(",");
  return `${partnerId}:${partnerCashBand(partner.cash)}:${positions}`;
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
 * Compound key: same deal + same coarse partner conditions.
 * NOTE: Issue #55 — unlocks only when deeds change or cash crosses a band
 * (e.g. flush → low); clears on the proposer's next PRE_ROLL turn.
 */
export function rejectedDealLockKey(
  fingerprint: string,
  partnerCondition: string,
): string {
  return `${fingerprint}::${partnerCondition}`;
}
