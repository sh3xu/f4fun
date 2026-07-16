import type { BoardTile as TileData } from "@f4fun/monopoly-engine";
import { Coins, Droplets, Gem, Gift, Sparkles, Train, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { getPlayerColor } from "@/lib/player-colors";
import { PROPERTY_IMAGES } from "../lib/property-images";
import {
  BOARD_MONEY_CLASS,
  MATERIAL_TILE,
  PROPERTY_COLORS,
} from "../theme/board-theme";
import { PropertyCoverImage } from "./PropertyCoverImage";
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
  playersOnTile?: Array<{ id: string; token: string; name: string }>;
  isMortgaged?: boolean;
  houses?: number;
  hotels?: number;
  turnOrder?: string[];
  onClick?: () => void;
}

type BoardSide = "bottom" | "left" | "top" | "right" | "corner";

const FLAG_SVGS: Record<string, { title: string; element: React.ReactNode }> = {
  brown: {
    title: "Brazil",
    element: (
      <>
        <rect width="9" height="6" fill="#009c3b" />
        <polygon points="4.5,0.8 8.2,3 4.5,5.2 0.8,3" fill="#ffdf00" />
        <circle cx="4.5" cy="3" r="1.1" fill="#0021ab" />
      </>
    ),
  },
  light_blue: {
    title: "China",
    element: (
      <>
        <rect width="9" height="6" fill="#de2910" />
        <polygon points="1.5,1 1.2,1.8 2,1.3 1,1.3 1.8,1.8" fill="#ffde00" />
      </>
    ),
  },
  pink: {
    title: "India",
    element: (
      <>
        <rect width="9" height="2" fill="#ff9933" />
        <rect y="2" width="9" height="2" fill="#fff" />
        <rect y="4" width="9" height="2" fill="#138808" />
        <circle cx="4.5" cy="3" r="0.4" fill="#000080" />
      </>
    ),
  },
  orange: {
    title: "South Africa",
    element: (
      <>
        <rect width="9" height="3" fill="#e21111" />
        <rect y="3" width="9" height="3" fill="#001489" />
        <path
          d="M0,0 L4.5,3 L0,6"
          fill="none"
          stroke="#fff"
          strokeWidth="1.5"
        />
        <path
          d="M0,0 L4.5,3 L0,6"
          fill="none"
          stroke="#007a4d"
          strokeWidth="0.8"
        />
        <polygon points="0,0.6 3.6,3 0,5.4" fill="#000" />
      </>
    ),
  },
  red: {
    title: "Russia",
    element: (
      <>
        <rect width="9" height="2" fill="#fff" />
        <rect y="2" width="9" height="2" fill="#0039a6" />
        <rect y="4" width="9" height="2" fill="#d52b1e" />
      </>
    ),
  },
  yellow: {
    title: "United Kingdom",
    element: (
      <>
        <rect width="9" height="6" fill="#00247d" />
        <path d="M0,0 L9,6 M9,0 L0,6" stroke="#fff" strokeWidth="1" />
        <path d="M0,0 L9,6 M9,0 L0,6" stroke="#cf142b" strokeWidth="0.6" />
        <path d="M4.5,0 L4.5,6 M0,3 L9,3" stroke="#fff" strokeWidth="1.6" />
        <path d="M4.5,0 L4.5,6 M0,3 L9,3" stroke="#cf142b" strokeWidth="1" />
      </>
    ),
  },
  green: {
    title: "United States",
    element: (
      <>
        <rect width="9" height="6" fill="#b22234" />
        <rect y="0.46" width="9" height="0.46" fill="#fff" />
        <rect y="1.38" width="9" height="0.46" fill="#fff" />
        <rect y="2.3" width="9" height="0.46" fill="#fff" />
        <rect y="3.23" width="9" height="0.46" fill="#fff" />
        <rect y="4.15" width="9" height="0.46" fill="#fff" />
        <rect y="5.07" width="9" height="0.46" fill="#fff" />
        <rect width="4.5" height="3.23" fill="#3c3b6e" />
      </>
    ),
  },
  dark_blue: {
    title: "France",
    element: (
      <>
        <rect width="3" height="6" fill="#002395" />
        <rect x="3" width="3" height="6" fill="#fff" />
        <rect x="6" width="3" height="6" fill="#ed2939" />
      </>
    ),
  },
};

function getBoardSide(position: number): BoardSide {
  if (position > 0 && position < 10) return "bottom";
  if (position > 10 && position < 20) return "left";
  if (position > 20 && position < 30) return "top";
  if (position > 30 && position < 40) return "right";
  return "corner";
}

function FlagBackdrop({ colorGroup }: { colorGroup: string }) {
  const flag = FLAG_SVGS[colorGroup];
  if (!flag) return null;

  return (
    <div className="h-[38%] w-[38%] select-none overflow-hidden rounded-full opacity-20">
      <svg className="h-full w-full" viewBox="0 0 9 6" aria-hidden>
        <title>{flag.title}</title>
        {flag.element}
      </svg>
    </div>
  );
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
    return <Train className={cn(cls, "text-white/85")} />;
  }
  if (tile.type === "utility") {
    return tile.name.includes("Electric") ? (
      <Zap className={cn(cls, "text-yellow-300/90")} />
    ) : (
      <Droplets className={cn(cls, "text-sky-300/90")} />
    );
  }
  if (tile.type === "tax") {
    return tile.name.includes("Income") ? (
      <Coins className={cn(cls, "text-amber-300/90")} />
    ) : (
      <Gem className={cn(cls, "text-purple-300/90")} />
    );
  }
  if (tile.type === "chance") {
    return <Sparkles className={cn(cls, "text-orange-300/90")} />;
  }
  if (tile.type === "community_chest") {
    return <Gift className={cn(cls, "text-purple-300/90")} />;
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
  // NOTE: Top/bottom use vertical lettering; left/right use horizontal (vice versa of classic Monopoly).
  const isVerticalText = side === "top" || side === "bottom";
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
    "text-center font-bold uppercase leading-[1.05] tracking-wide text-white/95",
    "drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]",
    "text-[length:var(--board-text-sm)]",
    "break-words line-clamp-2 overflow-hidden text-ellipsis px-0.5 max-w-full",
    // vertical-rl: letters stack top→bottom on upper/lower rows
    isVerticalText && "[writing-mode:vertical-rl] rotate-180",
  );

  const priceMode = cn(
    BOARD_MONEY_CLASS,
    "whitespace-nowrap leading-none",
    "text-[length:var(--board-money)]",
    isVerticalText && "[writing-mode:vertical-rl] rotate-180",
  );

  const tileTitle = `${getTileLabel(tile.name)}${isOwned && ownerName ? ` (owned by ${ownerName})` : ""}${isMortgaged ? " [Mortgaged]" : ""}`;

  const rootClassName = cn(
    "relative h-full w-full overflow-visible select-none",
    "transition-all duration-200",
    isCorner && "material-medallion",
    isClickable &&
      "cursor-pointer appearance-none border-0 bg-transparent p-0 text-left hover:z-20 hover:brightness-110 hover:ring-2 hover:ring-[var(--material-focus-glow)]",
    !isClickable && "hover:z-20 hover:brightness-105",
    isMortgaged && "opacity-50 saturate-[0.55]",
  );

  const cardClassName = cn(
    "relative flex h-full w-full overflow-hidden rounded-md",
    side === "bottom" && "flex-col",
    side === "top" && "flex-col-reverse",
    side === "left" && "flex-row-reverse",
    side === "right" && "flex-row",
    isCorner && "flex-col items-center justify-center",
  );

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
        <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden rounded-md">
          {PROPERTY_IMAGES[tile.position] && (
            <>
              <PropertyCoverImage
                src={PROPERTY_IMAGES[tile.position]}
                alt=""
                className="opacity-40 transition-opacity duration-200"
                sizes="80px"
              />
              <div className="absolute inset-0 bg-black/35" />
            </>
          )}
          {tile.type === "property" && colorStyle ? (
            <>
              <div className={cn("absolute inset-0", colorStyle.tint)} />
              <FlagBackdrop colorGroup={tile.colorGroup} />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700/35 via-slate-800/25 to-slate-900/45" />
          )}
        </div>
        <div
          className={cn("absolute inset-0 z-[1] rounded-md", MATERIAL_TILE)}
        />

        <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden p-0.5">
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
                <div
                  className="flex h-2 w-2.5 shrink-0 items-center justify-center rounded-sm border border-rose-400/50 bg-rose-600/90 text-[6px] font-bold leading-none text-white"
                  title="Hotel"
                >
                  H
                </div>
              ) : (
                [1, 2, 3, 4]
                  .slice(0, houses)
                  .map((houseNum) => (
                    <div
                      key={`house-${houseNum}`}
                      className="h-1.5 w-1.5 shrink-0 rounded-sm border border-emerald-300/40 bg-emerald-500/90"
                      title="House"
                    />
                  ))
              )}
            </div>
          )}

          {tileIcon && (
            <div className="shrink-0 opacity-90 drop-shadow-sm">{tileIcon}</div>
          )}

          <span className={textMode}>{label}</span>

          {playersOnTile.length > 0 && (
            <div
              className={cn(
                "absolute z-30 flex flex-wrap justify-center gap-0.5",
                side === "bottom" && "inset-x-0 bottom-0.5",
                side === "top" && "inset-x-0 top-0.5",
                side === "left" && "inset-y-0 left-0.5 flex-col items-center",
                side === "right" && "inset-y-0 right-0.5 flex-col items-center",
                isCorner && "inset-x-0 bottom-0.5",
              )}
            >
              {playersOnTile.map((player) => {
                const playerColor =
                  turnOrder.length > 0
                    ? getPlayerColor(player.id, turnOrder)
                    : null;
                return (
                  <div
                    key={player.id}
                    className="shadow-md transition-transform duration-150 hover:z-40 hover:scale-110"
                    title={player.name}
                  >
                    <Avatar
                      avatarId={player.token}
                      size="xs"
                      backgroundColor={playerColor?.hex}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {(colorStyle || (!isCorner && displayPrice)) && (
          <div
            className={cn(
              "relative z-20 flex shrink-0 items-center justify-center material-tile-band",
              colorStyle
                ? cn(colorStyle.bg, colorStyle.text, colorStyle.border)
                : "border-white/10 bg-white/10 text-white/80",
              side === "bottom" && "h-[22%] min-h-[14px] w-full border-t",
              side === "top" && "h-[22%] min-h-[14px] w-full border-b",
              side === "left" && "h-full w-[22%] min-w-[14px] border-r",
              side === "right" && "h-full w-[22%] min-w-[14px] border-l",
            )}
          >
            {displayPrice && <span className={priceMode}>{displayPrice}</span>}
          </div>
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
