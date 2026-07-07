import type { PlayerState } from "@f4fun/monopoly-engine";
import { Lock, Skull } from "lucide-react";
import { CounterTicker } from "@/components/animation/CounterTicker";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { getPlayerColor } from "@/lib/player-colors";
import { GLASS_CARD } from "../theme/board-theme";

interface PlayerHUDProps {
  player: PlayerState;
  isActive: boolean;
  isMe: boolean;
  turnOrder: string[];
}

export function PlayerHUD({
  player,
  isActive,
  isMe,
  turnOrder,
}: PlayerHUDProps) {
  const playerColor = getPlayerColor(player.id, turnOrder);

  return (
    <div
      className={cn(
        "rounded-lg p-2.5 transition-all relative overflow-hidden flex items-center gap-2.5 select-none w-full",
        GLASS_CARD,
        isActive ? "shadow-lg brightness-110" : "hover:brightness-105",
        player.isBankrupt && "opacity-40 grayscale",
      )}
      style={
        isActive && !player.isBankrupt
          ? {
              borderColor: `${playerColor.hex}60`,
              boxShadow: `0 0 16px ${playerColor.hex}20, inset 0 1px 0 rgba(255,255,255,0.06)`,
            }
          : undefined
      }
    >
      <Avatar
        avatarId={player.token}
        size="sm"
        isActive={isActive}
        backgroundColor={playerColor.hex}
      />

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-100 truncate flex items-center gap-1.5">
          <span>{player.name}</span>
          {isMe && (
            <span className="text-[9px] text-[#4fc3f7] font-semibold bg-[#4fc3f7]/10 px-1 py-px rounded border border-[#4fc3f7]/20">
              you
            </span>
          )}
        </p>
        <CounterTicker
          value={player.cash}
          className={cn(
            "text-sm font-extrabold tracking-tight mt-0.5",
            player.cash < 200
              ? "text-rose-400"
              : player.cash > 1000
                ? "text-emerald-400"
                : "text-gray-100",
          )}
        />

        <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
          <span>Properties:</span>
          <span className="font-bold text-gray-300">
            {player.ownedPositions.length}
          </span>
        </div>

        {player.isInJail && (
          <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1 mt-0.5">
            <Lock className="w-3 h-3" />
            Jail
          </span>
        )}

        {player.isBankrupt && (
          <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1 mt-0.5">
            <Skull className="w-3 h-3" />
            Bankrupt
          </span>
        )}
      </div>

      {isActive && !player.isBankrupt && (
        <div
          className="text-[8px] text-white font-bold px-1.5 py-0.5 rounded-full select-none shrink-0"
          style={{ backgroundColor: playerColor.hex }}
        >
          Active
        </div>
      )}
    </div>
  );
}
