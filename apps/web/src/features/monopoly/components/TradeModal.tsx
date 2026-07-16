"use client";

import type { GameState, TradeOffer } from "@f4fun/monopoly-engine";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { GameCard } from "@/components/ui/GameCard";
import { cn } from "@/lib/cn";
import { TradeOfferSummary } from "./IncomingTradeOfferCard";
import { getTileLabelAt } from "./tile-labels";

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
  const activePlayerId = state.turnOrder[state.activePlayerIndex];
  const isMyTurn = activePlayerId === myPlayerId;
  const canPropose =
    isMyTurn &&
    state.pendingTrades.length === 0 &&
    (state.phase === "PRE_ROLL" ||
      state.phase === "END_TURN" ||
      state.phase === "JAIL_DECISION");

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <GameCard
        stock="property"
        className={cn(
          "max-h-[90vh] w-full max-w-lg overflow-y-auto p-4 animate-card-deal",
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Trade</h2>
          <Button size="sm" variant="tokenGhost" onClick={onClose}>
            Close
          </Button>
        </div>

        {incoming.length > 0 && (
          <div className="mb-4 space-y-2">
            <h3 className="text-sm font-semibold text-white/80">Incoming</h3>
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

        {partners.length === 0 || !me ? (
          <p className="text-sm text-white/50">No partners available.</p>
        ) : !canPropose ? (
          <p className="text-sm text-white/50">
            {state.pendingTrades.length > 0
              ? "A trade offer is already pending."
              : "You can only propose a trade on your turn (before or after rolling)."}
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="text-white/50">Partner</span>
              <select
                value={toPlayerId}
                onChange={(e) => setToPlayerId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-white"
              >
                {partners.map((id) => (
                  <option key={id} value={id}>
                    {state.players[id]?.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 font-semibold text-[#4fc3f7]">You offer</p>
                <input
                  type="number"
                  min={0}
                  value={offer.cash}
                  onChange={(e) =>
                    setOffer((o) => ({ ...o, cash: Number(e.target.value) }))
                  }
                  className="mb-2 w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-white"
                  placeholder="Cash"
                />
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {me.ownedPositions.map((pos) => (
                    <label
                      key={pos}
                      className="flex items-center gap-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={offer.positions.includes(pos)}
                        onChange={(e) =>
                          togglePosition("offer", pos, e.target.checked)
                        }
                      />
                      {getTileLabelAt(pos)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 font-semibold text-amber-200">You request</p>
                <input
                  type="number"
                  min={0}
                  value={request.cash}
                  onChange={(e) =>
                    setRequest((r) => ({ ...r, cash: Number(e.target.value) }))
                  }
                  className="mb-2 w-full rounded border border-white/15 bg-black/30 px-2 py-1 text-white"
                  placeholder="Cash"
                />
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {partner?.ownedPositions.map((pos) => (
                    <label
                      key={pos}
                      className="flex items-center gap-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={request.positions.includes(pos)}
                        onChange={(e) =>
                          togglePosition("request", pos, e.target.checked)
                        }
                      />
                      {getTileLabelAt(pos)}
                    </label>
                  ))}
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
