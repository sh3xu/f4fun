"use client";

import type { GameState, PendingTrade } from "@f4fun/monopoly-engine";
import { Button } from "@/components/ui/Button";
import { GameCard } from "@/components/ui/GameCard";
import { cn } from "@/lib/cn";
import { ActionCountdown } from "./ActionCountdown";
import { getTileLabelAt } from "./tile-labels";

function formatOfferSide(
  cash: number,
  positions: number[],
  goojfCards: number,
): string {
  const parts: string[] = [];
  if (cash > 0) parts.push(`$${cash}`);
  if (positions.length > 0) {
    parts.push(positions.map((p) => getTileLabelAt(p)).join(", "));
  }
  if (goojfCards > 0) {
    parts.push(`${goojfCards} Jail Free`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Nothing";
}

interface TradeOfferSummaryProps {
  trade: PendingTrade;
  state: GameState;
  loading: boolean;
  onAccept: (tradeId: string) => void;
  onReject: (tradeId: string) => void;
  showCountdown?: boolean;
  className?: string;
}

export function TradeOfferSummary({
  trade,
  state,
  loading,
  onAccept,
  onReject,
  showCountdown = true,
  className,
}: TradeOfferSummaryProps) {
  const fromName = state.players[trade.fromPlayerId]?.name ?? "Player";

  return (
    <div
      className={cn(
        "rounded-lg border border-white/10 bg-white/5 p-3 text-sm",
        className,
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-semibold text-white">Trade from {fromName}</p>
        {showCountdown && (
          <ActionCountdown
            deadlineAt={trade.expiresAt}
            className="text-xs"
            urgentThresholdSecs={10}
          />
        )}
      </div>
      <p className="text-white/70">
        <span className="text-[#4fc3f7]">Offers:</span>{" "}
        {formatOfferSide(
          trade.offer.cash,
          trade.offer.positions,
          trade.offer.goojfCards,
        )}
      </p>
      <p className="mt-1 text-white/70">
        <span className="text-amber-200">Asks:</span>{" "}
        {formatOfferSide(
          trade.request.cash,
          trade.request.positions,
          trade.request.goojfCards,
        )}
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          variant="token"
          size="sm"
          disabled={loading}
          onClick={() => onAccept(trade.tradeId)}
        >
          Accept
        </Button>
        <Button
          variant="tokenGhost"
          size="sm"
          disabled={loading}
          onClick={() => onReject(trade.tradeId)}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}

interface IncomingTradeOfferCardProps {
  state: GameState;
  myPlayerId: string;
  loading: boolean;
  onAccept: (tradeId: string) => void;
  onReject: (tradeId: string) => void;
}

/** Always-visible incoming trade offers (not gated behind the Trade modal). */
export function IncomingTradeOfferCard({
  state,
  myPlayerId,
  loading,
  onAccept,
  onReject,
}: IncomingTradeOfferCardProps) {
  const incoming = state.pendingTrades.filter(
    (t) => t.toPlayerId === myPlayerId,
  );
  if (incoming.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-3 sm:top-4 sm:justify-end sm:pr-4 lg:right-[16.5rem] xl:right-[19.5rem]">
      <GameCard
        stock="buyPrompt"
        className="pointer-events-auto w-full max-w-sm space-y-2 p-3 animate-card-deal"
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/80">
          Incoming trades
        </h3>
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
      </GameCard>
    </div>
  );
}
