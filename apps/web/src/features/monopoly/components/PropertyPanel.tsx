import { TILE_BY_POSITION } from "@f4fun/monopoly-engine";
import { Droplets, Train, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { GLASS_CARD, PROPERTY_COLORS } from "../theme/board-theme";

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

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[clamp(0.5rem,1.5cqmin,0.85rem)]",
        GLASS_CARD,
      )}
    >
      {colorClass && (
        <div className={cn("h-[clamp(4px,1cqmin,8px)] w-full", colorClass)} />
      )}

      <div className="flex flex-col gap-[clamp(0.4rem,1.5cqmin,0.75rem)] p-[clamp(0.5rem,2cqmin,0.85rem)]">
        <h3 className="flex items-center gap-1.5 text-[length:var(--board-text)] font-bold text-white/90">
          {tile.type === "railroad" && (
            <Train className="h-[1em] w-[1em] text-white/70" />
          )}
          {tile.type === "utility" &&
            (tile.name.includes("Electric") ? (
              <Zap className="h-[1em] w-[1em] text-yellow-300" />
            ) : (
              <Droplets className="h-[1em] w-[1em] text-sky-300" />
            ))}
          {tile.name}
        </h3>

        <div className="flex items-baseline gap-2">
          <span className="text-[length:var(--board-text-sm)] text-white/50">
            Purchase Price:
          </span>
          <span className="text-[length:var(--board-text-lg)] font-black text-white">
            ${tile.price}
          </span>
        </div>

        {tile.type === "property" && (
          <div className="space-y-1 rounded-lg border border-white/[0.06] bg-white/[0.05] p-[clamp(0.5rem,1.8cqmin,0.9rem)] text-[length:var(--board-text-sm)]">
            <div className="flex justify-between">
              <span className="text-white/50">Base rent:</span>
              <span className="font-bold text-white/90">${tile.rent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">With monopoly:</span>
              <span className="font-bold text-[#4fc3f7]">${tile.rent * 2}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">House cost:</span>
              <span className="font-bold text-white/90">${tile.houseCost}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Mortgage value:</span>
              <span className="font-bold text-emerald-400">
                ${tile.price / 2}
              </span>
            </div>
          </div>
        )}

        {tile.type === "railroad" && (
          <div className="space-y-1 rounded-lg border border-white/[0.06] bg-white/[0.05] p-[clamp(0.5rem,1.8cqmin,0.9rem)] text-[length:var(--board-text-sm)]">
            <p className="mb-1 font-semibold text-white/70">Rent by count:</p>
            <div className="flex justify-between">
              <span className="text-white/50">1 Railroad:</span>
              <span className="font-bold text-white/90">$25</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">2 Railroads:</span>
              <span className="font-bold text-white/90">$50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">3 Railroads:</span>
              <span className="font-bold text-white/90">$100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">4 Railroads:</span>
              <span className="font-bold text-emerald-400">$200</span>
            </div>
          </div>
        )}

        {tile.type === "utility" && (
          <div className="space-y-1 rounded-lg border border-white/[0.06] bg-white/[0.05] p-[clamp(0.5rem,1.8cqmin,0.9rem)] text-[length:var(--board-text-sm)]">
            <div className="flex justify-between">
              <span className="text-white/50">1 Utility:</span>
              <span className="font-bold text-white/90">4x dice roll</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">2 Utilities:</span>
              <span className="font-bold text-emerald-400">10x dice roll</span>
            </div>
          </div>
        )}

        {!canAfford && (
          <div className="rounded-lg border border-rose-400/20 bg-rose-500/10 p-[clamp(0.5rem,1.8cqmin,0.9rem)] text-[length:var(--board-text-sm)] font-semibold text-rose-300">
            Insufficient funds (need ${tile.price - playerCash} more)
          </div>
        )}

        <div className="flex gap-[clamp(0.35rem,1.2cqmin,0.5rem)]">
          <Button
            onClick={onBuy}
            disabled={loading || !canAfford}
            size="sm"
            className="h-auto flex-1 border-0 bg-[#2196f3]/80 py-[clamp(0.4rem,1.4cqmin,0.65rem)] text-[length:var(--board-text-sm)] font-bold backdrop-blur-sm hover:bg-[#2196f3]"
            aria-label={`Buy ${tile.name}`}
          >
            {canAfford ? "Buy" : "Can't Afford"}
          </Button>
          <Button
            onClick={onDecline}
            disabled={loading}
            variant="outline"
            size="sm"
            className="h-auto flex-1 border-white/20 py-[clamp(0.4rem,1.4cqmin,0.65rem)] text-[length:var(--board-text-sm)] font-bold text-white/80 hover:bg-white/10"
            aria-label={`Skip ${tile.name}`}
          >
            Skip
          </Button>
          <Button
            onClick={onAuction}
            disabled={loading}
            variant="outline"
            size="sm"
            className="h-auto flex-1 border-amber-400/30 py-[clamp(0.4rem,1.4cqmin,0.65rem)] text-[length:var(--board-text-sm)] font-bold text-amber-200 hover:bg-amber-500/10"
            aria-label={`Auction ${tile.name}`}
          >
            Auction
          </Button>
        </div>
      </div>
    </div>
  );
}
