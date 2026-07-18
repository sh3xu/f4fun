"use client";

import type { GameState, PendingTrade } from "@f4fun/monopoly-engine";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { GameCard } from "@/components/ui/GameCard";
import { cn } from "@/lib/cn";
import { getPlayerColor } from "@/lib/player-colors";
import { ActionCountdown } from "./ActionCountdown";
import { PropertySwatch } from "./PropertySwatch";

function OfferSideVisual({
  cash,
  positions,
  goojfCards,
}: {
  cash: number;
  positions: number[];
  goojfCards: number;
}) {
  if (cash <= 0 && positions.length === 0 && goojfCards <= 0) {
    return <span className="text-white/40">Nothing</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {cash > 0 && <span>${cash}</span>}
      {positions.map((pos) => (
        <PropertySwatch key={pos} position={pos} className="text-xs" />
      ))}
      {goojfCards > 0 && <span>{goojfCards} Jail Free</span>}
    </span>
  );
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
  const from = state.players[trade.fromPlayerId];
  const fromName = from?.name ?? "Player";
  const fromColor = getPlayerColor(trade.fromPlayerId, state.turnOrder);

  return (
    <div
      className={cn(
        "rounded-lg border border-white/10 bg-white/5 p-3 text-sm",
        className,
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 font-semibold text-white">
          {from && (
            <Avatar
              avatarId={from.token}
              size="xs"
              backgroundColor={fromColor.hex}
            />
          )}
          <span className="truncate">Trade from {fromName}</span>
        </div>
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
        <OfferSideVisual
          cash={trade.offer.cash}
          positions={trade.offer.positions}
          goojfCards={trade.offer.goojfCards}
        />
      </p>
      <p className="mt-1 text-white/70">
        <span className="text-amber-200">Asks:</span>{" "}
        <OfferSideVisual
          cash={trade.request.cash}
          positions={trade.request.positions}
          goojfCards={trade.request.goojfCards}
        />
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
    <div className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-3 sm:top-4 sm:justify-end sm:pr-4 lg:right-[13.5rem] xl:right-[15.5rem]">
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
