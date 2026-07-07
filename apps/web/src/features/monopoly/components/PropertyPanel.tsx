import { TILE_BY_POSITION } from "@f4fun/monopoly-engine";
import { Droplets, Train, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { GLASS_CARD, PROPERTY_COLORS } from "../theme/board-theme";

interface PropertyPanelProps {
  position: number;
  onBuy: () => void;
  onDecline: () => void;
  loading: boolean;
  playerCash?: number;
}

export function PropertyPanel({
  position,
  onBuy,
  onDecline,
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
    <div className={cn("overflow-hidden rounded-lg", GLASS_CARD)}>
      {colorClass && <div className={cn("w-full h-2", colorClass)} />}

      <div className="p-3 flex flex-col gap-3">
        <h3 className="text-base font-bold text-white/90 flex items-center gap-2">
          {tile.type === "railroad" && (
            <Train className="w-4 h-4 text-white/70" />
          )}
          {tile.type === "utility" &&
            (tile.name.includes("Electric") ? (
              <Zap className="w-4 h-4 text-yellow-300" />
            ) : (
              <Droplets className="w-4 h-4 text-sky-300" />
            ))}
          {tile.name}
        </h3>

        <div className="flex items-baseline gap-2">
          <span className="text-xs text-white/50">Purchase Price:</span>
          <span className="text-2xl font-black text-white">${tile.price}</span>
        </div>

        {tile.type === "property" && (
          <div className="bg-white/[0.05] rounded-lg p-2.5 space-y-1 text-xs border border-white/[0.06]">
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
          <div className="bg-white/[0.05] rounded-lg p-2.5 space-y-1 text-xs border border-white/[0.06]">
            <p className="font-semibold text-white/70 mb-1">Rent by count:</p>
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
          <div className="bg-white/[0.05] rounded-lg p-2.5 space-y-1 text-xs border border-white/[0.06]">
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
          <div className="bg-rose-500/10 border border-rose-400/20 rounded-lg p-2.5 text-xs text-rose-300 font-semibold">
            Insufficient funds (need ${tile.price - playerCash} more)
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={onBuy}
            disabled={loading || !canAfford}
            className="flex-1 font-bold bg-[#2196f3]/80 backdrop-blur-sm hover:bg-[#2196f3] border-0"
            aria-label={`Buy ${tile.name}`}
          >
            {canAfford ? "Buy" : "Can't Afford"}
          </Button>
          <Button
            onClick={onDecline}
            disabled={loading}
            variant="outline"
            className="flex-1 font-bold border-white/20 text-white/80 hover:bg-white/10"
            aria-label={`Decline ${tile.name}`}
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
