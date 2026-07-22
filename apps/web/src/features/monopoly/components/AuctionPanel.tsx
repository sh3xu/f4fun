"use client";

import type { AuctionState, GameState } from "@f4fun/monopoly-engine";
import { TILE_BY_POSITION } from "@f4fun/monopoly-engine";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CashAmountSlider } from "@/components/ui/CashAmountSlider";
import { GameCard } from "@/components/ui/GameCard";
import { cn } from "@/lib/cn";
import { PROPERTY_IMAGES } from "../lib/property-images";
import { CardPhotoBackdrop } from "./CardPhotoBackdrop";
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
  const bidHistory = auction.bidHistory ?? [];

  useEffect(() => {
    setBidAmount(myCash >= auction.minNextBid ? auction.minNextBid : myCash);
  }, [auction.minNextBid, myCash]);

  const highBidderName = auction.highBidderId
    ? state.players[auction.highBidderId]?.name
    : null;
  const currentBidderName = currentBidderId
    ? state.players[currentBidderId]?.name
    : null;
  const coverSrc = PROPERTY_IMAGES[auction.position];

  return (
    <GameCard
      stock="auction"
      header={`Auction · ${tile ? getTileLabel(tile.name) : `Tile ${auction.position}`}`}
      className="w-full max-w-[28rem] animate-card-deal"
      backdrop={
        coverSrc ? (
          <CardPhotoBackdrop src={coverSrc} veil="strong" />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-[clamp(0.4rem,1.5cqmin,0.75rem)] p-[clamp(0.5rem,2cqmin,0.85rem)]">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1 rounded-md border border-slate-200 bg-slate-50 p-[clamp(0.5rem,1.8cqmin,0.9rem)] text-[length:var(--board-text-sm)]">
            <div className="flex justify-between">
              <span className="text-slate-500">Type:</span>
              <span className="font-bold text-slate-800">
                {auction.kind === "bank" ? "Bank" : "Owner sale"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">High bid:</span>
              <span className="font-bold text-emerald-600">
                {auction.highBid > 0 ? `$${auction.highBid}` : "None yet"}
              </span>
            </div>
            {highBidderName && (
              <div className="flex justify-between">
                <span className="text-slate-500">Leader:</span>
                <span className="font-bold text-slate-800">
                  {highBidderName}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Bidding:</span>
              <span className="font-bold text-teal-700">
                {currentBidderName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Min next:</span>
              <span className="font-bold text-slate-800">
                ${auction.minNextBid}
              </span>
            </div>
          </div>

          <div className="flex min-h-[6.5rem] flex-col rounded-md border border-slate-200 bg-slate-50 p-[clamp(0.5rem,1.8cqmin,0.9rem)]">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Bid history
            </p>
            {bidHistory.length === 0 ? (
              <p className="text-[length:var(--board-text-sm)] text-slate-400">
                No bids yet
              </p>
            ) : (
              <ul className="max-h-28 flex-1 space-y-1 overflow-y-auto text-[length:var(--board-text-sm)]">
                {[...bidHistory].reverse().map((entry, index) => {
                  const name = state.players[entry.playerId]?.name ?? "Player";
                  const detail =
                    entry.kind === "bid" && entry.amount != null
                      ? `bid $${entry.amount}`
                      : entry.kind === "pass"
                        ? "passed"
                        : "autofolded";
                  return (
                    <li
                      key={`${entry.playerId}-${entry.kind}-${entry.amount}-${index}`}
                      className="flex justify-between gap-2 leading-snug"
                    >
                      <span className="truncate font-semibold text-slate-700">
                        {name}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums",
                          entry.kind === "bid"
                            ? "font-bold text-emerald-600"
                            : "text-slate-400",
                        )}
                      >
                        {detail}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {isSeller && (
          <p className="text-[length:var(--board-text-sm)] text-slate-500">
            You are selling — you cannot bid.
          </p>
        )}

        {isMyBidTurn && !isSeller && (
          <div className="flex flex-col gap-2">
            <CashAmountSlider
              id="auction-bid-amount"
              label="Your bid"
              min={auction.minNextBid}
              max={myCash}
              value={bidAmount}
              onChange={setBidAmount}
              disabled={!canAffordMin}
            />
            <div className="flex gap-2">
              <Button
                variant="token"
                onClick={() => onBid(bidAmount)}
                disabled={
                  loading || !canAffordMin || bidAmount < auction.minNextBid
                }
                size="sm"
                className="h-auto flex-1 py-[clamp(0.4rem,1.4cqmin,0.65rem)] text-[length:var(--board-text-sm)] font-bold [--material-token-face:#f59e0b]"
              >
                Bid
              </Button>
              <Button
                variant="tokenGhost"
                onClick={onPass}
                disabled={loading}
                size="sm"
                className="h-auto flex-1 py-[clamp(0.4rem,1.4cqmin,0.65rem)] text-[length:var(--board-text-sm)] font-bold"
              >
                Pass
              </Button>
            </div>
          </div>
        )}

        {!isMyBidTurn && !isSeller && (
          <p className="text-center text-[length:var(--board-text-sm)] text-slate-500">
            Waiting for {currentBidderName ?? "next bidder"}...
          </p>
        )}
      </div>
    </GameCard>
  );
}
