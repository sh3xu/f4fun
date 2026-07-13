"use client";

import type { GameState, PlayerState } from "@f4fun/monopoly-engine";
import { TILE_BY_POSITION } from "@f4fun/monopoly-engine";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { GLASS_CARD, PROPERTY_COLORS } from "../theme/board-theme";

interface PropertyManagePanelProps {
  state: GameState;
  player: PlayerState;
  loading: boolean;
  onBuildHouse: (position: number) => void;
  onSellHouse: (position: number) => void;
  onBuildHotel: (position: number) => void;
  onSellHotel: (position: number) => void;
  onMortgage: (position: number) => void;
  onUnmortgage: (position: number) => void;
  onOwnerAuction: (position: number) => void;
  onOpenTrade: () => void;
}

export function PropertyManagePanel({
  state,
  player,
  loading,
  onBuildHouse,
  onSellHouse,
  onBuildHotel,
  onSellHotel,
  onMortgage,
  onUnmortgage,
  onOwnerAuction,
  onOpenTrade,
}: PropertyManagePanelProps) {
  const [selected, setSelected] = useState<number | null>(
    player.ownedPositions[0] ?? null,
  );

  if (player.ownedPositions.length === 0) {
    return (
      <div className={cn("rounded-lg p-3 text-sm text-white/60", GLASS_CARD)}>
        No properties owned yet.
        <Button
          onClick={onOpenTrade}
          disabled={loading}
          size="sm"
          variant="outline"
          className="mt-2 w-full border-white/20 text-white/80"
        >
          Trade
        </Button>
      </div>
    );
  }

  const position = selected ?? player.ownedPositions[0];
  const tile = TILE_BY_POSITION.get(position);
  const ownership = state.ownership[position];
  const houses = player.houses[position] ?? 0;
  const hotels = player.hotels[position] ?? 0;
  const hasBuildings = houses > 0 || hotels > 0;
  const isMortgaged = ownership?.isMortgaged ?? false;
  const isProperty = tile?.type === "property";
  const colorClass =
    tile?.type === "property" ? PROPERTY_COLORS[tile.colorGroup]?.bg : "";

  return (
    <div className={cn("overflow-hidden rounded-lg", GLASS_CARD)}>
      {colorClass && <div className={cn("h-1.5 w-full", colorClass)} />}
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white/90">Manage</h3>
          <Button
            onClick={onOpenTrade}
            disabled={loading}
            size="sm"
            variant="outline"
            className="border-white/20 text-xs text-white/80"
          >
            Trade
          </Button>
        </div>

        <select
          value={position}
          onChange={(e) => setSelected(Number(e.target.value))}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white"
          aria-label="Select property"
        >
          {player.ownedPositions.map((pos) => {
            const t = TILE_BY_POSITION.get(pos);
            const mort = state.ownership[pos]?.isMortgaged ? " (M)" : "";
            return (
              <option key={pos} value={pos}>
                {t?.name ?? `Tile ${pos}`}
                {mort}
              </option>
            );
          })}
        </select>

        <p className="text-xs text-white/50">
          {isMortgaged ? "Mortgaged" : "Unmortgaged"}
          {isProperty ? ` · ${houses}H ${hotels}Hotel` : ""}
        </p>

        <div className="grid grid-cols-2 gap-1.5">
          {isProperty && (
            <>
              <Button
                size="sm"
                disabled={loading || isMortgaged}
                onClick={() =>
                  houses >= 4 ? onBuildHotel(position) : onBuildHouse(position)
                }
                className="border-0 bg-[#2196f3]/70 text-xs font-bold"
              >
                Build
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || !hasBuildings}
                onClick={() =>
                  hotels > 0 ? onSellHotel(position) : onSellHouse(position)
                }
                className="border-white/20 text-xs font-bold text-white/80"
              >
                Sell
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={loading || (isMortgaged ? false : hasBuildings)}
            onClick={() =>
              isMortgaged ? onUnmortgage(position) : onMortgage(position)
            }
            className="border-white/20 text-xs font-bold text-white/80"
          >
            {isMortgaged ? "Unmortgage" : "Mortgage"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={loading || hasBuildings}
            onClick={() => onOwnerAuction(position)}
            className="border-amber-400/30 text-xs font-bold text-amber-200"
          >
            Auction
          </Button>
        </div>
      </div>
    </div>
  );
}
