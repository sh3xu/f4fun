"use client";

import type { AuctionState, GameState } from "@f4fun/monopoly-engine";
import { TILE_BY_POSITION } from "@f4fun/monopoly-engine";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { GLASS_CARD } from "../theme/board-theme";
import { ActionCountdown } from "./ActionCountdown";
import { getTileLabel } from "./tile-labels";

interface AuctionPanelProps {
  auction: AuctionState;
  state: GameState;
  myPlayerId: string | null;
  loading: boolean;
  onBid: (amount: number) => void;
  onPass: () => void;
}

export function AuctionPanel({
  auction,
  state,
  myPlayerId,
  loading,
  onBid,
  onPass,
}: AuctionPanelProps) {
  const tile = TILE_BY_POSITION.get(auction.position);
  const currentBidderId = auction.bidderOrder[auction.currentBidderIndex];
  const isMyBidTurn = myPlayerId !== null && currentBidderId === myPlayerId;
  const isSeller = myPlayerId !== null && auction.sellerId === myPlayerId;
  const myCash = myPlayerId ? (state.players[myPlayerId]?.cash ?? 0) : 0;
  const canAffordMin = myCash >= auction.minNextBid;
  const [bidAmount, setBidAmount] = useState(auction.minNextBid);

  useEffect(() => {
    setBidAmount(auction.minNextBid);
  }, [auction.minNextBid]);

  const highBidderName = auction.highBidderId
    ? state.players[auction.highBidderId]?.name
    : null;
  const currentBidderName = currentBidderId
    ? state.players[currentBidderId]?.name
    : null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[clamp(0.5rem,1.5cqmin,0.85rem)]",
        GLASS_CARD,
      )}
    >
      <div className="flex flex-col gap-[clamp(0.4rem,1.5cqmin,0.75rem)] p-[clamp(0.5rem,2cqmin,0.85rem)]">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[length:var(--board-text)] font-bold text-amber-200">
            Auction:{" "}
            {tile ? getTileLabel(tile.name) : `Tile ${auction.position}`}
          </h3>
          <ActionCountdown
            deadlineAt={state.actionDeadlineAt}
            pausedMs={state.actionDeadlinePausedMs}
            className="text-[length:var(--board-text-sm)]"
          />
        </div>

        <div className="space-y-1 rounded-lg border border-white/[0.06] bg-white/[0.05] p-[clamp(0.5rem,1.8cqmin,0.9rem)] text-[length:var(--board-text-sm)]">
          <div className="flex justify-between">
            <span className="text-white/50">Type:</span>
            <span className="font-bold text-white/90">
              {auction.kind === "bank" ? "Bank" : "Owner sale"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">High bid:</span>
            <span className="font-bold text-emerald-400">
              {auction.highBid > 0 ? `$${auction.highBid}` : "None yet"}
            </span>
          </div>
          {highBidderName && (
            <div className="flex justify-between">
              <span className="text-white/50">Leader:</span>
              <span className="font-bold text-white/90">{highBidderName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-white/50">Bidding:</span>
            <span className="font-bold text-[#4fc3f7]">
              {currentBidderName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Min next:</span>
            <span className="font-bold text-white/90">
              ${auction.minNextBid}
            </span>
          </div>
        </div>

        {isSeller && (
          <p className="text-[length:var(--board-text-sm)] text-white/60">
            You are selling — you cannot bid.
          </p>
        )}

        {isMyBidTurn && !isSeller && (
          <div className="flex flex-col gap-2">
            <input
              type="number"
              min={auction.minNextBid}
              max={myCash}
              value={bidAmount}
              onChange={(e) => setBidAmount(Number(e.target.value))}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-[length:var(--board-text-sm)] text-white"
              aria-label="Bid amount"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => onBid(bidAmount)}
                disabled={
                  loading || !canAffordMin || bidAmount < auction.minNextBid
                }
                size="sm"
                className="h-auto flex-1 border-0 bg-amber-500/80 py-[clamp(0.4rem,1.4cqmin,0.65rem)] text-[length:var(--board-text-sm)] font-bold hover:bg-amber-500"
              >
                Bid
              </Button>
              <Button
                onClick={onPass}
                disabled={loading}
                variant="outline"
                size="sm"
                className="h-auto flex-1 border-white/20 py-[clamp(0.4rem,1.4cqmin,0.65rem)] text-[length:var(--board-text-sm)] font-bold text-white/80"
              >
                Pass
              </Button>
            </div>
          </div>
        )}

        {!isMyBidTurn && !isSeller && (
          <p className="text-center text-[length:var(--board-text-sm)] text-white/50">
            Waiting for {currentBidderName ?? "next bidder"}...
          </p>
        )}
      </div>
    </div>
  );
}
