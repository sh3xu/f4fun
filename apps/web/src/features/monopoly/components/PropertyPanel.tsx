import { TILE_BY_POSITION } from "@f4fun/monopoly-engine";
import { Droplets, Train, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  BOARD_MONEY_CLASS,
  GLASS_CARD,
  PROPERTY_COLORS,
} from "../theme/board-theme";
import { getTileLabel } from "./tile-labels";

interface PropertyPanelProps {
  position: number;
  onBuy: () => void;
  onDecline: () => void;
  onAuction: () => void;
  loading: boolean;
  playerCash?: number;
}

export function PropertyPanel({
  position,
  onBuy,
  onDecline,
  onAuction,
  loading,
  playerCash = 0,
}: PropertyPanelProps) {
  const tile = TILE_BY_POSITION.get(position);

  if (
    !tile ||
    (tile.type !== "property" &&
      tile.type !== "railroad" &&
      tile.type !== "utility")
  ) {
    return null;
  }

  const canAfford = playerCash >= tile.price;
  const colorClass =
    tile.type === "property" ? PROPERTY_COLORS[tile.colorGroup]?.bg : "";
  const label = getTileLabel(tile.name);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[clamp(0.35rem,1.2cqmin,0.65rem)]",
        GLASS_CARD,
      )}
    >
      {colorClass && (
        <div className={cn("h-[clamp(3px,0.8cqmin,6px)] w-full", colorClass)} />
      )}

      <div className="flex flex-col gap-[clamp(0.25rem,1cqmin,0.5rem)] p-[clamp(0.35rem,1.4cqmin,0.65rem)]">
        <h3 className="flex items-center gap-1 text-[length:var(--board-text-sm)] font-bold text-white/90">
          {tile.type === "railroad" && (
            <Train className="h-[1em] w-[1em] text-white/70" />
          )}
          {tile.type === "utility" &&
            (tile.name.includes("Electric") ? (
              <Zap className="h-[1em] w-[1em] text-yellow-300" />
            ) : (
              <Droplets className="h-[1em] w-[1em] text-sky-300" />
            ))}
          {label}
        </h3>

        <div className="flex items-baseline gap-1.5">
          <span className="text-[length:var(--board-text-xs)] text-white/50">
            Price
          </span>
          <span
            className={cn(
              BOARD_MONEY_CLASS,
              "text-[length:var(--board-text)] font-black text-white",
            )}
          >
            ${tile.price}
          </span>
        </div>

        {tile.type === "property" && (
          <div className="space-y-0.5 rounded-md border border-white/[0.06] bg-white/[0.05] p-[clamp(0.3rem,1.2cqmin,0.55rem)] text-[length:var(--board-text-xs)]">
            <div className="flex justify-between gap-2">
              <span className="text-white/50">Rent</span>
              <span className={cn(BOARD_MONEY_CLASS, "text-white/90")}>
                ${tile.rent}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/50">Monopoly</span>
              <span className={cn(BOARD_MONEY_CLASS, "text-[#4fc3f7]")}>
                ${tile.rent * 2}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/50">House</span>
              <span className={cn(BOARD_MONEY_CLASS, "text-white/90")}>
                ${tile.houseCost}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/50">Mortgage</span>
              <span className={cn(BOARD_MONEY_CLASS, "text-emerald-400")}>
                ${tile.price / 2}
              </span>
            </div>
          </div>
        )}

        {tile.type === "railroad" && (
          <div className="space-y-0.5 rounded-md border border-white/[0.06] bg-white/[0.05] p-[clamp(0.3rem,1.2cqmin,0.55rem)] text-[length:var(--board-text-xs)]">
            <p className="mb-0.5 font-semibold text-white/70">Rent by count</p>
            {[
              [1, 25],
              [2, 50],
              [3, 100],
              [4, 200],
            ].map(([count, rent]) => (
              <div key={count} className="flex justify-between gap-2">
                <span className="text-white/50">{count} RR</span>
                <span
                  className={cn(
                    BOARD_MONEY_CLASS,
                    count === 4 ? "text-emerald-400" : "text-white/90",
                  )}
                >
                  ${rent}
                </span>
              </div>
            ))}
          </div>
        )}

        {tile.type === "utility" && (
          <div className="space-y-0.5 rounded-md border border-white/[0.06] bg-white/[0.05] p-[clamp(0.3rem,1.2cqmin,0.55rem)] text-[length:var(--board-text-xs)]">
            <div className="flex justify-between gap-2">
              <span className="text-white/50">1 Utility</span>
              <span className="font-bold text-white/90">4x dice</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-white/50">2 Utilities</span>
              <span className="font-bold text-emerald-400">10x dice</span>
            </div>
          </div>
        )}

        {!canAfford && (
          <div className="rounded-md border border-rose-400/20 bg-rose-500/10 p-[clamp(0.3rem,1.2cqmin,0.55rem)] text-[length:var(--board-text-xs)] font-semibold text-rose-300">
            Need ${tile.price - playerCash} more
          </div>
        )}

        <div className="flex gap-[clamp(0.25rem,0.9cqmin,0.4rem)]">
          <Button
            onClick={onBuy}
            disabled={loading || !canAfford}
            size="sm"
            className="h-auto flex-1 border-0 bg-[#2196f3]/80 py-[clamp(0.25rem,1cqmin,0.45rem)] text-[length:var(--board-text-xs)] font-bold backdrop-blur-sm hover:bg-[#2196f3]"
            aria-label={`Buy ${label}`}
          >
            {canAfford ? "Buy" : "Can't Afford"}
          </Button>
          <Button
            onClick={onDecline}
            disabled={loading}
            variant="outline"
            size="sm"
            className="h-auto flex-1 border-white/20 py-[clamp(0.25rem,1cqmin,0.45rem)] text-[length:var(--board-text-xs)] font-bold text-white/80 hover:bg-white/10"
            aria-label={`Skip ${label}`}
          >
            Skip
          </Button>
          <Button
            onClick={onAuction}
            disabled={loading}
            variant="outline"
            size="sm"
            className="h-auto flex-1 border-amber-400/30 py-[clamp(0.25rem,1cqmin,0.45rem)] text-[length:var(--board-text-xs)] font-bold text-amber-200 hover:bg-amber-500/10"
            aria-label={`Auction ${label}`}
          >
            Auction
          </Button>
        </div>
      </div>
    </div>
  );
}
