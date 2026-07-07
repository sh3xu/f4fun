import type { BoardTile as TileData } from "@f4fun/monopoly-engine";
import {
  Coins,
  Compass,
  Droplets,
  Flag,
  Gem,
  Gift,
  Lock,
  Siren,
  Sparkles,
  Train,
  Zap,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { getPlayerColor } from "@/lib/player-colors";
import { GLASS_TILE, PROPERTY_COLORS } from "../theme/board-theme";

interface BoardTileProps {
  tile: TileData;
  ownerId?: string;
  ownerToken?: string;
  playersOnTile?: Array<{ id: string; token: string; name: string }>;
  isMortgaged?: boolean;
  houses?: number;
  hotels?: number;
  turnOrder?: string[];
}

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

function FlagBackdrop({
  colorGroup,
  large,
}: {
  colorGroup: string;
  large?: boolean;
}) {
  const flag = FLAG_SVGS[colorGroup];
  if (!flag) return null;

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden shadow-md select-none",
        large ? "w-[68%] h-[68%] opacity-95" : "w-5 h-5 border border-white/20",
      )}
    >
      <svg className="w-full h-full object-cover" viewBox="0 0 9 6">
        <title>{flag.title}</title>
        {flag.element}
      </svg>
    </div>
  );
}

function getTileIcon(tile: TileData) {
  if (tile.type === "railroad") {
    return <Train className="w-5 h-5 text-white/70" />;
  }
  if (tile.type === "utility") {
    return tile.name.includes("Electric") ? (
      <Zap className="w-5 h-5 text-yellow-300/80 fill-yellow-300/10" />
    ) : (
      <Droplets className="w-5 h-5 text-sky-300/80 fill-sky-300/10" />
    );
  }
  if (tile.type === "tax") {
    return tile.name.includes("Income") ? (
      <Coins className="w-5 h-5 text-amber-300/80" />
    ) : (
      <Gem className="w-5 h-5 text-purple-300/80" />
    );
  }
  if (tile.type === "chance") {
    return <Sparkles className="w-5 h-5 text-orange-300/80" />;
  }
  if (tile.type === "community_chest") {
    return <Gift className="w-5 h-5 text-purple-300/80" />;
  }
  if (tile.type === "go") {
    return <Flag className="w-6 h-6 text-emerald-300/80 fill-emerald-300/10" />;
  }
  if (tile.type === "jail") {
    return <Lock className="w-5 h-5 text-white/50" />;
  }
  if (tile.type === "free_parking") {
    return <Compass className="w-5 h-5 text-blue-300/80" />;
  }
  if (tile.type === "go_to_jail") {
    return <Siren className="w-5 h-5 text-rose-400/80" />;
  }
  return null;
}

export function BoardTile({
  tile,
  ownerId,
  ownerToken,
  playersOnTile = [],
  isMortgaged = false,
  houses = 0,
  hotels = 0,
  turnOrder = [],
}: BoardTileProps) {
  const colorStyle =
    tile.type === "property" ? PROPERTY_COLORS[tile.colorGroup] : null;
  const isOwned = !!ownerId;
  const tileIcon = getTileIcon(tile);
  const isSpecialCorner = ["go", "jail", "free_parking", "go_to_jail"].includes(
    tile.type,
  );
  const ownerColor =
    ownerId && turnOrder.length > 0 ? getPlayerColor(ownerId, turnOrder) : null;

  const isBottom = tile.position > 0 && tile.position < 10;
  const isLeft = tile.position > 10 && tile.position < 20;
  const isTop = tile.position > 20 && tile.position < 30;
  const isRight = tile.position > 30 && tile.position < 40;
  const isVerticalSide = isLeft || isRight;

  const renderOuterPriceBanner = () => {
    if (!colorStyle || tile.type !== "property") return null;
    const priceText = isMortgaged ? "M" : `${tile.price}$`;

    return (
      <div
        className={cn(
          "absolute flex items-center justify-center font-extrabold tracking-tight text-[7.5px] md:text-[8.5px] select-none z-20 shrink-0",
          colorStyle.bg,
          colorStyle.text,
          isBottom && "bottom-0 inset-x-0 h-[22%] min-h-[14px] border-t",
          isTop && "top-0 inset-x-0 h-[22%] min-h-[14px] border-b",
          isLeft && "left-0 inset-y-0 w-[22%] min-w-[14px] border-r",
          isRight && "right-0 inset-y-0 w-[22%] min-w-[14px] border-l",
          colorStyle.border,
        )}
      >
        <span
          className={cn(
            "whitespace-nowrap",
            isLeft && "rotate-90",
            isRight && "-rotate-90",
          )}
        >
          {priceText}
        </span>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "relative flex overflow-hidden",
        "transition-all duration-200 hover:z-20 hover:brightness-110",
        "w-full h-full select-none",
        isSpecialCorner && "justify-center flex-col",
        isBottom && "flex-col pb-[22%]",
        isTop && "flex-col-reverse pt-[22%]",
        isLeft && "flex-row-reverse pr-[22%]",
        isRight && "flex-row pl-[22%]",
        isMortgaged && "opacity-50 saturate-[0.6]",
      )}
      title={`${tile.name}${isOwned ? ` (owned by ${ownerToken})` : ""}${isMortgaged ? " [Mortgaged]" : ""}`}
    >
      {/* Layer 1: flag or icon backdrop — visible through frosted glass */}
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        {tile.type === "property" && colorStyle ? (
          <>
            <div className={cn("absolute inset-0", colorStyle.tint)} />
            <FlagBackdrop colorGroup={tile.colorGroup} large />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-800/30 to-slate-900/50 flex items-center justify-center">
            {tileIcon && (
              <div className="opacity-40 scale-150 blur-[1px]">{tileIcon}</div>
            )}
          </div>
        )}
      </div>

      {/* Layer 2: frosted glass surface */}
      <div className={cn("absolute inset-0 z-[1]", GLASS_TILE)} />

      {/* Layer 3: content */}
      <div
        className={cn(
          "relative z-10 flex w-full h-full",
          isSpecialCorner && "justify-center flex-col p-1",
          isBottom && "flex-col pt-0.5",
          isTop && "flex-col-reverse pb-0.5",
          isLeft && "flex-row-reverse pl-0.5",
          isRight && "flex-row pr-0.5",
        )}
      >
        {renderOuterPriceBanner()}

        {!isMortgaged && (houses > 0 || hotels > 0) && (
          <div
            className={cn(
              "absolute z-20 flex gap-px",
              isBottom && "bottom-[24%] left-0 right-0 justify-center",
              isTop && "top-[24%] left-0 right-0 justify-center",
              isLeft &&
                "left-[24%] top-0 bottom-0 flex-col justify-center items-center",
              isRight &&
                "right-[24%] top-0 bottom-0 flex-col justify-center items-center",
            )}
          >
            {hotels > 0 ? (
              <div
                className="w-2.5 h-2 bg-rose-600/90 backdrop-blur-sm rounded-sm border border-rose-400/50 flex items-center justify-center text-[6px] text-white font-bold leading-none shrink-0"
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
                    className="w-1.5 h-1.5 bg-emerald-500/90 backdrop-blur-sm rounded-sm border border-emerald-300/40 shrink-0"
                    title="House"
                  />
                ))
            )}
          </div>
        )}

        <div className="flex-grow flex items-center justify-center min-h-0 min-w-0 w-full h-full relative px-0.5 overflow-hidden">
          <span
            className={cn(
              "font-bold text-center select-none leading-tight text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]",
              tileIcon
                ? "text-[7px] md:text-[8px] text-white/75"
                : "text-[7.5px] md:text-[9px]",
              isVerticalSide &&
                "whitespace-nowrap uppercase tracking-wide text-[7px] md:text-[8px]",
              isLeft && "rotate-90",
              isRight && "-rotate-90",
            )}
          >
            {tile.name}
          </span>

          {isOwned && ownerToken && ownerColor && (
            <div
              className={cn(
                "absolute z-30 shadow-lg rounded-full scale-[0.75] overflow-hidden border-2 border-white/30",
                isBottom && "top-0 right-0",
                isTop && "bottom-0 right-0",
                isLeft && "top-0 right-0",
                isRight && "top-0 left-0",
              )}
              style={{ borderColor: ownerColor.hex }}
            >
              <Avatar
                avatarId={ownerToken}
                size="xs"
                backgroundColor={ownerColor.hex}
              />
            </div>
          )}

          {isOwned && ownerColor && (
            <div
              className={cn(
                "absolute z-20",
                isBottom && "left-0 right-0 top-0 h-[3px]",
                isTop && "left-0 right-0 bottom-0 h-[3px]",
                isLeft && "top-0 bottom-0 right-0 w-[3px]",
                isRight && "top-0 bottom-0 left-0 w-[3px]",
              )}
              style={{ backgroundColor: ownerColor.hex }}
            />
          )}
        </div>

        {isSpecialCorner && (
          <div className="flex flex-col items-center justify-center w-full h-full flex-grow gap-0.5 py-0.5">
            {tileIcon && (
              <div className="shrink-0 drop-shadow-md">{tileIcon}</div>
            )}
            <span className="text-[7px] md:text-[8.5px] font-bold text-center text-white/90 uppercase tracking-tight max-w-full leading-tight px-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {tile.name}
            </span>
            {tile.type === "tax" && (
              <span className="text-[6.5px] md:text-[7.5px] text-white/60 font-bold select-none">
                $200
              </span>
            )}
          </div>
        )}

        {(tile.type === "railroad" || tile.type === "utility") && (
          <div
            className={cn(
              "absolute z-20 flex flex-col items-center gap-0.5 select-none drop-shadow-md",
              isBottom && "top-[30%] left-0 right-0",
              isTop && "bottom-[30%] left-0 right-0",
              isLeft && "right-[30%] top-0 bottom-0 justify-center",
              isRight && "left-[30%] top-0 bottom-0 justify-center",
            )}
          >
            {tileIcon}
          </div>
        )}

        {playersOnTile.length > 0 && (
          <div
            className={cn(
              "absolute flex gap-0.5 flex-wrap z-30 justify-center",
              isBottom && "top-[35%] left-0 right-0",
              isTop && "bottom-[35%] left-0 right-0",
              isLeft && "right-[35%] top-0 bottom-0 flex-col items-center",
              isRight && "left-[35%] top-0 bottom-0 flex-col items-center",
              isSpecialCorner && "bottom-1 left-0 right-0",
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
                  className="transform hover:scale-110 hover:z-40 transition-transform duration-150 shadow-md"
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
    </div>
  );
}
