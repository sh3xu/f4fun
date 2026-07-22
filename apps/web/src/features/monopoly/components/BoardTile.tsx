import type { BoardTile as TileData } from "@f4fun/monopoly-engine";
import { Coins, Droplets, Gem, Gift, Sparkles, Train, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { getPlayerColor } from "@/lib/player-colors";
import { PROPERTY_IMAGES } from "../lib/property-images";
import {
  BOARD_LABEL_CLASS,
  BOARD_MONEY_CLASS,
  MATERIAL_TILE,
  PROPERTY_COLORS,
} from "../theme/board-theme";
import { HotelMarker, HouseMarker } from "./BuildingMarkers";
import { CardPhotoBackdrop } from "./CardPhotoBackdrop";
import { getTileLabel } from "./tile-labels";

const CORNER_MEDALLIONS: Partial<Record<TileData["type"], string>> = {
  go: "/materials/corners/go.svg",
  jail: "/materials/corners/jail.svg",
  free_parking: "/materials/corners/parking.svg",
  go_to_jail: "/materials/corners/goto-jail.svg",
};
interface BoardTileProps {
  tile: TileData;
  ownerId?: string;
  ownerName?: string;
  playersOnTile?: Array<{
    id: string;
    token: string;
    name: string;
    isInJail?: boolean;
  }>;
  isMortgaged?: boolean;
  houses?: number;
  hotels?: number;
  turnOrder?: string[];
  onClick?: () => void;
}

type BoardSide = "bottom" | "left" | "top" | "right" | "corner";

function getBoardSide(position: number): BoardSide {
  if (position > 0 && position < 10) return "bottom";
  if (position > 10 && position < 20) return "left";
  if (position > 20 && position < 30) return "top";
  if (position > 30 && position < 40) return "right";
  return "corner";
}

function getTileIcon(tile: TileData) {
  const medallion = CORNER_MEDALLIONS[tile.type];
  if (medallion) {
    return (
      // NOTE: Local SVG motif — next/image unnecessary for tiny static public assets
      // biome-ignore lint/performance/noImgElement: corner medallion SVG from /public
      <img
        src={medallion}
        alt=""
        className="h-[clamp(1.1rem,4.5cqmin,2rem)] w-[clamp(1.1rem,4.5cqmin,2rem)] drop-shadow-md"
        draggable={false}
      />
    );
  }

  const cls =
    "h-[clamp(0.7rem,2.8cqmin,1rem)] w-[clamp(0.7rem,2.8cqmin,1rem)] shrink-0";
  if (tile.type === "railroad") {
    return <Train className={cn(cls, "text-slate-600")} />;
  }
  if (tile.type === "utility") {
    return tile.name.includes("Electric") ? (
      <Zap className={cn(cls, "text-amber-500")} />
    ) : (
      <Droplets className={cn(cls, "text-sky-500")} />
    );
  }
  if (tile.type === "tax") {
    return tile.name.includes("Income") ? (
      <Coins className={cn(cls, "text-amber-600")} />
    ) : (
      <Gem className={cn(cls, "text-violet-500")} />
    );
  }
  if (tile.type === "chance") {
    return <Sparkles className={cn(cls, "text-orange-500")} />;
  }
  if (tile.type === "community_chest") {
    return <Gift className={cn(cls, "text-teal-600")} />;
  }
  return null;
}

export function BoardTile({
  tile,
  ownerId,
  ownerName,
  playersOnTile = [],
  isMortgaged = false,
  houses = 0,
  hotels = 0,
  turnOrder = [],
  onClick,
}: BoardTileProps) {
  const colorStyle =
    tile.type === "property" ? PROPERTY_COLORS[tile.colorGroup] : null;
  const isOwned = !!ownerId;
  const tileIcon = getTileIcon(tile);
  const side = getBoardSide(tile.position);
  const isCorner = side === "corner";
  const isVerticalLabel = side === "top" || side === "bottom";
  const isVerticalPrice = side === "left" || side === "right";
  const ownerColor =
    ownerId && turnOrder.length > 0 ? getPlayerColor(ownerId, turnOrder) : null;

  const label = getTileLabel(tile.name);
  const hasPrice =
    tile.type === "property" ||
    tile.type === "railroad" ||
    tile.type === "utility";
  const price =
    hasPrice && "price" in tile ? (isMortgaged ? "M" : `$${tile.price}`) : null;
  const taxAmount =
    tile.type === "tax" && "amount" in tile ? `$${tile.amount}` : null;
  const displayPrice = price ?? taxAmount;
  const isClickable =
    tile.type === "property" ||
    tile.type === "railroad" ||
    tile.type === "utility";

  const textMode = cn(
    BOARD_LABEL_CLASS,
    "text-center font-bold uppercase leading-[1.05] tracking-wide text-slate-800",
    "text-[length:var(--board-text-sm)]",
    "break-words line-clamp-2 overflow-hidden text-ellipsis px-0.5 max-w-full",
    isVerticalLabel && "[writing-mode:vertical-rl] rotate-180",
  );

  const priceMode = cn(
    BOARD_MONEY_CLASS,
    "whitespace-nowrap leading-none",
    "text-[length:var(--board-money)]",
    isVerticalPrice && "[writing-mode:vertical-rl] rotate-180",
  );

  const tileTitle = `${getTileLabel(tile.name)}${isOwned && ownerName ? ` (owned by ${ownerName})` : ""}${isMortgaged ? " [Mortgaged]" : ""}`;

  const rootClassName = cn(
    "relative h-full w-full overflow-visible select-none",
    "transition-all duration-200",
    isCorner && "material-medallion",
    isOwned && "z-[1]",
    isClickable &&
      "cursor-pointer appearance-none border-0 bg-transparent p-0 text-left hover:z-20 hover:brightness-110 hover:ring-2 hover:ring-[var(--material-focus-glow)]",
    !isClickable && "hover:z-20 hover:brightness-105",
  );

  const cardClassName = cn(
    "relative flex h-full w-full overflow-hidden rounded-sm",
    side === "bottom" && "flex-col",
    side === "top" && "flex-col-reverse",
    side === "left" && "flex-row-reverse",
    side === "right" && "flex-row",
    isCorner && "flex-col items-center justify-center",
  );

  const isJail = tile.type === "jail";
  const jailedPlayers = isJail ? playersOnTile.filter((p) => p.isInJail) : [];
  const visitingPlayers = isJail
    ? playersOnTile.filter((p) => !p.isInJail)
    : playersOnTile;

  // NOTE: Shrink + overlap tokens so multi-landings stay inside the tile face.
  const tokenSizeClass = (count: number) => {
    if (count <= 1) {
      return "h-[clamp(0.85rem,3.4cqmin,1.35rem)] w-[clamp(0.85rem,3.4cqmin,1.35rem)]";
    }
    if (count === 2) {
      return "h-[clamp(0.65rem,2.7cqmin,1.05rem)] w-[clamp(0.65rem,2.7cqmin,1.05rem)]";
    }
    if (count === 3) {
      return "h-[clamp(0.55rem,2.2cqmin,0.9rem)] w-[clamp(0.55rem,2.2cqmin,0.9rem)]";
    }
    return "h-[clamp(0.42rem,1.75cqmin,0.72rem)] w-[clamp(0.42rem,1.75cqmin,0.72rem)]";
  };

  const tokenStackClass = (count: number, axis: "x" | "y") =>
    cn(
      "absolute z-30 flex max-w-full flex-wrap justify-center",
      axis === "y" && "flex-col items-center",
      count >= 2 && axis === "x" && "-space-x-1.5",
      count >= 4 && axis === "x" && "-space-x-2",
      count >= 2 && axis === "y" && "-space-y-1.5",
      count >= 4 && axis === "y" && "-space-y-2",
    );

  const renderToken = (
    player: (typeof playersOnTile)[number],
    count: number,
    index: number,
  ) => {
    const playerColor =
      turnOrder.length > 0 ? getPlayerColor(player.id, turnOrder) : null;
    return (
      <div
        key={player.id}
        className="relative shrink-0 shadow-md transition-transform duration-150 hover:z-40 hover:scale-110"
        style={{ zIndex: index + 1 }}
        title={player.name}
      >
        <Avatar
          avatarId={player.token}
          size={count <= 1 ? "xs" : "xxs"}
          backgroundColor={playerColor?.hex}
          className={tokenSizeClass(count)}
        />
      </div>
    );
  };

  const content = (
    <>
      {isOwned && ownerColor && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute z-30 shadow-[0_1px_3px_rgba(0,0,0,0.35)]",
            // Dome sits outside the card on the board-facing edge
            side === "bottom" &&
              "left-1/2 bottom-full h-[clamp(0.4rem,2.2cqmin,0.65rem)] w-[clamp(0.7rem,4cqmin,1.1rem)] -translate-x-1/2 rounded-t-full",
            side === "top" &&
              "left-1/2 top-full h-[clamp(0.4rem,2.2cqmin,0.65rem)] w-[clamp(0.7rem,4cqmin,1.1rem)] -translate-x-1/2 rounded-b-full",
            side === "left" &&
              "top-1/2 left-full h-[clamp(0.7rem,4cqmin,1.1rem)] w-[clamp(0.4rem,2.2cqmin,0.65rem)] -translate-y-1/2 rounded-r-full",
            side === "right" &&
              "top-1/2 right-full h-[clamp(0.7rem,4cqmin,1.1rem)] w-[clamp(0.4rem,2.2cqmin,0.65rem)] -translate-y-1/2 rounded-l-full",
            isCorner &&
              "left-1/2 bottom-full h-[clamp(0.4rem,2.2cqmin,0.65rem)] w-[clamp(0.7rem,4cqmin,1.1rem)] -translate-x-1/2 rounded-t-full",
          )}
          style={{ backgroundColor: ownerColor.hex }}
        />
      )}

      <div className={cardClassName}>
        <div
          className={cn(
            "absolute inset-0 z-0 overflow-hidden rounded-sm",
            isMortgaged && "opacity-50 saturate-[0.55]",
          )}
        >
          {PROPERTY_IMAGES[tile.position] ? (
            <CardPhotoBackdrop
              src={PROPERTY_IMAGES[tile.position]}
              density="tile"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100/80 via-white/40 to-teal-50/50" />
          )}
        </div>
        <div
          className={cn(
            "absolute inset-0 z-[1] rounded-sm",
            // NOTE: Keep cream slot when no art; stay translucent over blurred photos.
            PROPERTY_IMAGES[tile.position]
              ? "rounded-sm border border-slate-900/10 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
              : MATERIAL_TILE,
            isMortgaged && "opacity-50",
          )}
        />

        {isJail ? (
          <div className="relative z-10 h-full w-full overflow-hidden p-0.5">
            <div className="absolute inset-[18%] z-10 flex flex-col items-center justify-center gap-0.5 rounded-sm border border-amber-400/50 bg-amber-50">
              {tileIcon && (
                <div className="shrink-0 opacity-90 drop-shadow-sm">
                  {tileIcon}
                </div>
              )}
              <span className="text-[length:var(--board-text-xs)] font-bold tracking-wide text-amber-800 uppercase">
                Jail
              </span>
              {jailedPlayers.length > 0 && (
                <div
                  className={cn(
                    tokenStackClass(jailedPlayers.length, "x"),
                    "inset-x-0 bottom-0.5 px-0.5",
                  )}
                >
                  {jailedPlayers.map((p, i) =>
                    renderToken(p, jailedPlayers.length, i),
                  )}
                </div>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 z-20 flex h-[16%] items-center justify-center border-t border-slate-200 bg-slate-50/90">
              <span className="pointer-events-none absolute left-1 text-[6px] font-bold tracking-wider text-slate-400 uppercase">
                Visiting
              </span>
              <div
                className={cn(
                  "relative flex max-w-full flex-wrap justify-center",
                  visitingPlayers.length >= 2 && "-space-x-1.5",
                  visitingPlayers.length >= 4 && "-space-x-2",
                )}
              >
                {visitingPlayers.map((p, i) =>
                  renderToken(p, visitingPlayers.length, i),
                )}
              </div>
            </div>
            <div className="absolute inset-y-0 right-0 z-20 flex w-[16%] flex-col items-center justify-center border-l border-slate-200 bg-slate-50/90">
              <span className="pointer-events-none rotate-180 text-[6px] font-bold tracking-wider text-slate-400 uppercase [writing-mode:vertical-rl]">
                Visiting
              </span>
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "relative z-10 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden p-0.5",
                isMortgaged && "opacity-50 saturate-[0.55]",
              )}
            >
              {!isMortgaged && (houses > 0 || hotels > 0) && (
                <div
                  className={cn(
                    "absolute z-20 flex gap-px",
                    side === "bottom" && "inset-x-0 top-0.5 justify-center",
                    side === "top" && "inset-x-0 bottom-0.5 justify-center",
                    side === "left" &&
                      "inset-y-0 right-0.5 flex-col items-center justify-center",
                    side === "right" &&
                      "inset-y-0 left-0.5 flex-col items-center justify-center",
                  )}
                >
                  {hotels > 0 ? (
                    <HotelMarker />
                  ) : (
                    <HouseMarker count={houses} />
                  )}
                </div>
              )}

              {tileIcon && (
                <div className="shrink-0 opacity-90 drop-shadow-sm">
                  {tileIcon}
                </div>
              )}

              <span className={textMode}>{label}</span>

              {visitingPlayers.length > 0 && (
                <div
                  className={cn(
                    tokenStackClass(
                      visitingPlayers.length,
                      side === "left" || side === "right" ? "y" : "x",
                    ),
                    side === "bottom" && "inset-x-0 bottom-0.5",
                    side === "top" && "inset-x-0 top-0.5",
                    side === "left" && "inset-y-0 left-0.5",
                    side === "right" && "inset-y-0 right-0.5",
                    isCorner && "inset-x-0 bottom-0.5",
                  )}
                >
                  {visitingPlayers.map((p, i) =>
                    renderToken(p, visitingPlayers.length, i),
                  )}
                </div>
              )}
            </div>

            {(colorStyle || (!isCorner && displayPrice)) && (
              <div
                className={cn(
                  // NOTE: Color ribbon stays full-opacity above faded mortgaged body.
                  "material-tile-band relative z-30 flex shrink-0 items-center justify-center",
                  colorStyle
                    ? cn(colorStyle.bg, colorStyle.text, colorStyle.border)
                    : "border-slate-200 bg-slate-100 text-slate-700",
                  isMortgaged && "ring-1 ring-black/20 ring-inset",
                  side === "bottom" && "h-[30%] min-h-[16px] w-full border-t",
                  side === "top" && "h-[30%] min-h-[16px] w-full border-b",
                  side === "left" && "h-full w-[30%] min-w-[16px] border-r",
                  side === "right" && "h-full w-[30%] min-w-[16px] border-l",
                )}
              >
                {displayPrice && (
                  <span className={priceMode}>{displayPrice}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={tileTitle}
        aria-label={tileTitle}
        className={rootClassName}
      >
        {content}
      </button>
    );
  }

  return (
    <div title={tileTitle} className={rootClassName}>
      {content}
    </div>
  );
}
