"use client";

import type { GameState, TradeOffer } from "@f4fun/monopoly-engine";
import { buildingsBlockDeedAction } from "@f4fun/monopoly-engine";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CashAmountSlider } from "@/components/ui/CashAmountSlider";
import { GameCard } from "@/components/ui/GameCard";
import { cn } from "@/lib/cn";
import { getPlayerColor } from "@/lib/player-colors";
import { ActionCountdown } from "./ActionCountdown";
import { OfferSideVisual, TradeOfferSummary } from "./IncomingTradeOfferCard";
import { PropertySwatch } from "./PropertySwatch";

const emptyOffer = (): TradeOffer => ({
  cash: 0,
  positions: [],
  goojfCards: 0,
});

interface TradeModalProps {
  state: GameState;
  myPlayerId: string;
  loading: boolean;
  onClose: () => void;
  onPropose: (
    toPlayerId: string,
    offer: TradeOffer,
    request: TradeOffer,
  ) => void;
  onAccept: (tradeId: string) => void;
  onReject: (tradeId: string) => void;
}

export function TradeModal({
  state,
  myPlayerId,
  loading,
  onClose,
  onPropose,
  onAccept,
  onReject,
}: TradeModalProps) {
  const partners = useMemo(
    () =>
      state.turnOrder.filter(
        (id) => id !== myPlayerId && !state.players[id]?.isBankrupt,
      ),
    [state, myPlayerId],
  );

  const [toPlayerId, setToPlayerId] = useState(partners[0] ?? "");
  const [offer, setOffer] = useState<TradeOffer>(emptyOffer);
  const [request, setRequest] = useState<TradeOffer>(emptyOffer);

  const me = state.players[myPlayerId];
  const partner = toPlayerId ? state.players[toPlayerId] : null;
  const incoming = state.pendingTrades.filter(
    (t) => t.toPlayerId === myPlayerId,
  );
  const outgoing = state.pendingTrades.find(
    (t) => t.fromPlayerId === myPlayerId,
  );
  const outgoingPartner = outgoing ? state.players[outgoing.toPlayerId] : null;
  const activePlayerId = state.turnOrder[state.activePlayerIndex];
  const isMyTurn = activePlayerId === myPlayerId;
  // NOTE: Debtor may trade during RAISE_CASH even if they are not the active player.
  const isDebtor =
    state.phase === "RAISE_CASH" && state.pendingDebt?.playerId === myPlayerId;
  const canPropose =
    state.pendingTrades.length === 0 &&
    ((isMyTurn &&
      (state.phase === "PRE_ROLL" ||
        state.phase === "END_TURN" ||
        state.phase === "JAIL_DECISION")) ||
      isDebtor);
  const meColor = getPlayerColor(myPlayerId, state.turnOrder);
  const partnerColor = toPlayerId
    ? getPlayerColor(toPlayerId, state.turnOrder)
    : null;

  function togglePosition(
    side: "offer" | "request",
    position: number,
    checked: boolean,
  ) {
    const setter = side === "offer" ? setOffer : setRequest;
    setter((prev) => ({
      ...prev,
      positions: checked
        ? [...prev.positions, position]
        : prev.positions.filter((p) => p !== position),
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <GameCard
        stock="property"
        className={cn(
          "max-h-[90vh] w-full max-w-lg overflow-y-auto p-4 animate-card-deal",
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Trade</h2>
          <Button size="sm" variant="tokenGhost" onClick={onClose}>
            Close
          </Button>
        </div>

        {incoming.length > 0 && (
          <div className="mb-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Incoming</h3>
            {incoming.map((trade) => (
              <TradeOfferSummary
                key={trade.tradeId}
                trade={trade}
                state={state}
                loading={loading}
                onAccept={onAccept}
                onReject={onReject}
              />
            ))}
          </div>
        )}

        {outgoing && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-700">
                Waiting for response
              </h3>
              <ActionCountdown
                deadlineAt={outgoing.expiresAt}
                className="text-xs"
                urgentThresholdSecs={10}
              />
            </div>
            <div className="rounded-lg border border-teal-400/25 bg-teal-50 p-3 text-sm">
              <p className="mb-2 text-slate-700">
                Waiting for{" "}
                <span className="font-semibold text-slate-900">
                  {outgoingPartner?.name ?? "partner"}
                </span>{" "}
                to accept or decline your offer.
              </p>
              <p className="text-slate-600">
                <span className="text-teal-700">You offer:</span>{" "}
                <OfferSideVisual
                  cash={outgoing.offer.cash}
                  positions={outgoing.offer.positions}
                  goojfCards={outgoing.offer.goojfCards}
                />
              </p>
              <p className="mt-1 text-slate-600">
                <span className="text-amber-200">You ask:</span>{" "}
                <OfferSideVisual
                  cash={outgoing.request.cash}
                  positions={outgoing.request.positions}
                  goojfCards={outgoing.request.goojfCards}
                />
              </p>
              <Button
                variant="tokenGhost"
                size="sm"
                disabled={loading}
                onClick={() => onReject(outgoing.tradeId)}
                className="mt-3"
              >
                Cancel offer
              </Button>
            </div>
          </div>
        )}

        {partners.length === 0 || !me ? (
          <p className="text-sm text-slate-500">No partners available.</p>
        ) : outgoing || incoming.length > 0 ? null : !canPropose ? (
          <p className="text-sm text-slate-500">
            {state.pendingTrades.length > 0
              ? "A trade offer is already pending."
              : "You can only propose a trade on your turn (before or after rolling)."}
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <span id="trade-partner-label" className="text-slate-500">
                Partner
              </span>
              <div
                role="radiogroup"
                aria-labelledby="trade-partner-label"
                className="mt-1 flex flex-wrap gap-1.5"
              >
                {partners.map((id) => {
                  const p = state.players[id];
                  if (!p) return null;
                  const color = getPlayerColor(id, state.turnOrder);
                  const selected = id === toPlayerId;
                  return (
                    <label
                      key={id}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                        selected
                          ? "border-teal-400/50 bg-teal-50 text-slate-900"
                          : "border-slate-200 bg-slate-100 text-slate-600 hover:border-teal-300",
                      )}
                    >
                      <input
                        type="radio"
                        name="trade-partner"
                        value={id}
                        checked={selected}
                        onChange={() => setToPlayerId(id)}
                        className="sr-only"
                      />
                      <Avatar
                        avatarId={p.token}
                        size="xs"
                        backgroundColor={color.hex}
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center gap-1.5 font-semibold text-teal-700">
                  <Avatar
                    avatarId={me.token}
                    size="xs"
                    backgroundColor={meColor.hex}
                  />
                  You offer
                </div>
                <CashAmountSlider
                  id="trade-offer-cash"
                  label="Cash"
                  min={0}
                  max={me.cash}
                  value={Math.min(offer.cash, me.cash)}
                  onChange={(cash) => setOffer((o) => ({ ...o, cash }))}
                  className="mb-2"
                />
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {me.ownedPositions.map((pos) => {
                    const blocked =
                      buildingsBlockDeedAction(state, myPlayerId, pos) !== null;
                    return (
                      <label
                        key={pos}
                        className={cn(
                          "flex items-center gap-2 text-xs",
                          blocked && "opacity-40",
                        )}
                        title={
                          blocked
                            ? "Sell all houses/hotels evenly from this color group first."
                            : undefined
                        }
                      >
                        <input
                          type="checkbox"
                          disabled={blocked}
                          checked={offer.positions.includes(pos)}
                          onChange={(e) =>
                            togglePosition("offer", pos, e.target.checked)
                          }
                        />
                        <PropertySwatch position={pos} />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-1.5 font-semibold text-amber-200">
                  {partner && partnerColor && (
                    <Avatar
                      avatarId={partner.token}
                      size="xs"
                      backgroundColor={partnerColor.hex}
                    />
                  )}
                  You request
                </div>
                <CashAmountSlider
                  id="trade-request-cash"
                  label="Cash"
                  min={0}
                  max={partner?.cash ?? 0}
                  value={Math.min(request.cash, partner?.cash ?? 0)}
                  onChange={(cash) => setRequest((r) => ({ ...r, cash }))}
                  className="mb-2"
                />
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {partner?.ownedPositions.map((pos) => {
                    const blocked =
                      buildingsBlockDeedAction(state, toPlayerId, pos) !== null;
                    return (
                      <label
                        key={pos}
                        className={cn(
                          "flex items-center gap-2 text-xs",
                          blocked && "opacity-40",
                        )}
                        title={
                          blocked
                            ? "Sell all houses/hotels evenly from this color group first."
                            : undefined
                        }
                      >
                        <input
                          type="checkbox"
                          disabled={blocked}
                          checked={request.positions.includes(pos)}
                          onChange={(e) =>
                            togglePosition("request", pos, e.target.checked)
                          }
                        />
                        <PropertySwatch position={pos} />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <Button
              variant="token"
              disabled={loading || !toPlayerId}
              onClick={() => onPropose(toPlayerId, offer, request)}
              className="w-full"
            >
              Propose Trade
            </Button>
          </div>
        )}
      </GameCard>
    </div>
  );
}
