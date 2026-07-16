"use client";

import { TILE_BY_POSITION } from "@f4fun/monopoly-engine";
import { ChevronDown, Droplets, Train, Zap } from "lucide-react";
import { Fragment, useState } from "react";
import { GameCard } from "@/components/ui/GameCard";
import { cn } from "@/lib/cn";
import { PROPERTY_IMAGES } from "../lib/property-images";
import { BOARD_MONEY_CLASS, PROPERTY_COLORS } from "../theme/board-theme";
import { PropertyActions } from "./PropertyActions";
import { PropertyCoverImage } from "./PropertyCoverImage";
import { getTileLabel } from "./tile-labels";

interface PropertyPanelBuyProps {
  mode: "buy";
  position: number;
  playerCash: number;
  loading: boolean;
  onBuy: () => void;
  onDecline: () => void;
  onAuction: () => void;
}

interface PropertyPanelManageProps {
  mode: "manage";
  position: number;
  loading: boolean;
  isMortgaged: boolean;
  houses: number;
  hotels: number;
  onBuild: () => void;
  onSell: () => void;
  onMortgage: () => void;
  onUnmortgage: () => void;
  onOwnerAuction: () => void;
  onSellToBank: () => void;
  onClose: () => void;
}

interface PropertyPanelViewProps {
  mode: "view";
  position: number;
  onClose: () => void;
  ownerName?: string;
  isMortgaged?: boolean;
  houses?: number;
  hotels?: number;
}

export type PropertyPanelProps =
  | PropertyPanelBuyProps
  | PropertyPanelManageProps
  | PropertyPanelViewProps;

/** Center overlay card: buy offer, own-property manage, or view-only info. */
export function PropertyPanel(props: PropertyPanelProps) {
  const tile = TILE_BY_POSITION.get(props.position);
  const [rentOpen, setRentOpen] = useState(false);

  if (
    !tile ||
    (tile.type !== "property" &&
      tile.type !== "railroad" &&
      tile.type !== "utility")
  ) {
    return null;
  }

  const colorClass =
    tile.type === "property" ? PROPERTY_COLORS[tile.colorGroup]?.bg : "";
  const label = getTileLabel(tile.name);
  const canAfford =
    props.mode === "buy" ? props.playerCash >= tile.price : false;
  const isMortgaged =
    props.mode === "buy" ? false : (props.isMortgaged ?? false);
  const houses = props.mode === "buy" ? 0 : (props.houses ?? 0);
  const hotels = props.mode === "buy" ? 0 : (props.hotels ?? 0);
  const ownerName = props.mode === "view" ? props.ownerName : undefined;
  const stock = props.mode === "buy" ? "buyPrompt" : "property";

  return (
    <GameCard
      stock={stock}
      header={label}
      headerClassName={cn(
        colorClass || "bg-gradient-to-b from-slate-600 to-slate-700",
        "text-[length:var(--board-text-sm)]",
      )}
      className="animate-card-deal"
    >
      {PROPERTY_IMAGES[props.position] && (
        <div className="relative h-[clamp(3rem,11cqmin,6rem)] w-full overflow-hidden">
          <PropertyCoverImage
            src={PROPERTY_IMAGES[props.position]}
            alt={label}
            className="brightness-[0.8]"
            sizes="280px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(18,26,40,0.95)] via-transparent to-transparent" />
        </div>
      )}

      <div className="flex flex-col gap-[clamp(0.25rem,1cqmin,0.5rem)] p-[clamp(0.35rem,1.4cqmin,0.65rem)]">
        {(tile.type === "railroad" || tile.type === "utility") && (
          <div
            className="flex items-center gap-1 text-[length:var(--board-text-sm)]"
            aria-hidden
          >
            {tile.type === "railroad" && (
              <Train className="h-[1em] w-[1em] text-white/70" />
            )}
            {tile.type === "utility" &&
              (tile.name.includes("Electric") ? (
                <Zap className="h-[1em] w-[1em] text-yellow-300" />
              ) : (
                <Droplets className="h-[1em] w-[1em] text-sky-300" />
              ))}
          </div>
        )}

        {ownerName && (
          <p className="text-[length:var(--board-text-xs)] text-white/50">
            Owned by {ownerName}
            {isMortgaged ? " · Mortgaged" : ""}
            {tile.type === "property" ? ` · ${houses}H ${hotels}Hotel` : ""}
          </p>
        )}

        {props.mode === "manage" && (
          <p className="text-[length:var(--board-text-xs)] text-white/50">
            {isMortgaged ? "Mortgaged" : "Unmortgaged"}
            {tile.type === "property" ? ` · ${houses}H ${hotels}Hotel` : ""}
          </p>
        )}

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

        {(tile.type === "property" ||
          tile.type === "railroad" ||
          tile.type === "utility") && (
          <div>
            <button
              type="button"
              onClick={() => setRentOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[length:var(--board-text-xs)] font-semibold text-white/70 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--material-focus-glow)]"
              aria-expanded={rentOpen}
            >
              {rentOpen ? "Hide rent schedule" : "Show rent schedule"}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  rentOpen && "rotate-180",
                )}
              />
            </button>
            {rentOpen && tile.type === "property" && (
              <div className="mt-1 space-y-0.5 rounded-md border border-white/[0.06] bg-white/[0.05] p-[clamp(0.3rem,1.2cqmin,0.55rem)] text-[length:var(--board-text-xs)]">
                {tile.rentLevels.map((rent, i) => {
                  if (i === 0) {
                    return (
                      <Fragment key="rent-schedule-base">
                        <div className="flex justify-between gap-2">
                          <span className="text-white/50">Rent</span>
                          <span
                            className={cn(BOARD_MONEY_CLASS, "text-white/90")}
                          >
                            ${rent}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#4fc3f7]">Monopoly</span>
                          <span
                            className={cn(BOARD_MONEY_CLASS, "text-[#4fc3f7]")}
                          >
                            ${tile.rent * 2}
                          </span>
                        </div>
                      </Fragment>
                    );
                  }

                  const rentLabel =
                    i < 5 ? `${i} House${i > 1 ? "s" : ""}` : "Hotel";
                  return (
                    <div key={rentLabel} className="flex justify-between gap-2">
                      <span className="text-white/50">{rentLabel}</span>
                      <span className={cn(BOARD_MONEY_CLASS, "text-white/90")}>
                        ${rent}
                      </span>
                    </div>
                  );
                })}
                <div className="mt-1 flex justify-between gap-2 border-t border-white/[0.06] pt-0.5">
                  <span className="text-white/50">Mortgage</span>
                  <span className={cn(BOARD_MONEY_CLASS, "text-emerald-400")}>
                    ${tile.price / 2}
                  </span>
                </div>
              </div>
            )}
            {rentOpen && tile.type === "railroad" && (
              <div className="mt-1 space-y-0.5 rounded-md border border-white/[0.06] bg-white/[0.05] p-[clamp(0.3rem,1.2cqmin,0.55rem)] text-[length:var(--board-text-xs)]">
                <p className="mb-0.5 font-semibold text-white/70">
                  Rent by count
                </p>
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
            {rentOpen && tile.type === "utility" && (
              <div className="mt-1 space-y-0.5 rounded-md border border-white/[0.06] bg-white/[0.05] p-[clamp(0.3rem,1.2cqmin,0.55rem)] text-[length:var(--board-text-xs)]">
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
          </div>
        )}

        {props.mode === "buy" && !canAfford && (
          <div className="rounded-md border border-rose-400/20 bg-rose-500/10 p-[clamp(0.3rem,1.2cqmin,0.55rem)] text-[length:var(--board-text-xs)] font-semibold text-rose-300">
            Need ${tile.price - props.playerCash} more — that move&apos;s not
            covered yet
          </div>
        )}

        {props.mode === "buy" && (
          <PropertyActions
            mode="buy"
            label={label}
            canAfford={canAfford}
            loading={props.loading}
            onBuy={props.onBuy}
            onDecline={props.onDecline}
            onAuction={props.onAuction}
          />
        )}

        {props.mode === "manage" && (
          <PropertyActions
            mode="manage"
            label={label}
            loading={props.loading}
            isProperty={tile.type === "property"}
            isMortgaged={props.isMortgaged}
            houses={props.houses}
            hotels={props.hotels}
            onBuild={props.onBuild}
            onSell={props.onSell}
            onMortgage={props.onMortgage}
            onUnmortgage={props.onUnmortgage}
            onOwnerAuction={props.onOwnerAuction}
            onSellToBank={props.onSellToBank}
            onClose={props.onClose}
          />
        )}

        {props.mode === "view" && (
          <PropertyActions mode="view" onClose={props.onClose} />
        )}
      </div>
    </GameCard>
  );
}
