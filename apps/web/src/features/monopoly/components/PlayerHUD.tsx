import type { PlayerState } from "@f4fun/monopoly-engine";
import { Lock, Skull } from "lucide-react";
import { CounterTicker } from "@/components/animation/CounterTicker";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { getPlayerColor } from "@/lib/player-colors";
import { BOARD_MONEY_CLASS, GLASS_CARD } from "../theme/board-theme";
import { TurnTimerRing } from "./TurnTimerRing";

interface PlayerHUDProps {
  player: PlayerState;
  isActive: boolean;
  isMe: boolean;
  turnOrder: string[];
  deadlineAt?: string | null;
  deadlinePausedMs?: number | null;
  timerDurationSecs?: number | null;
}

export function PlayerHUD({
  player,
  isActive,
  isMe,
  turnOrder,
  deadlineAt = null,
  deadlinePausedMs = null,
  timerDurationSecs = null,
}: PlayerHUDProps) {
  const playerColor = getPlayerColor(player.id, turnOrder);

  return (
    <div
      className={cn(
        "relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl p-3 select-none transition-all",
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

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-gray-100">
          <span className="truncate">{player.name}</span>
          {isMe && (
            <span className="shrink-0 rounded border border-[#4fc3f7]/20 bg-[#4fc3f7]/10 px-1 py-px text-[9px] font-semibold text-[#4fc3f7]">
              you
            </span>
          )}
          {isActive && !player.isBankrupt && (
            <TurnTimerRing
              deadlineAt={deadlineAt}
              pausedMs={deadlinePausedMs}
              durationSecs={timerDurationSecs}
              className="ml-0.5"
            />
          )}
        </div>
        <CounterTicker
          value={player.cash}
          className={cn(
            BOARD_MONEY_CLASS,
            "mt-0.5 text-sm",
            player.cash < 200
              ? "text-rose-400"
              : player.cash > 1000
                ? "text-emerald-400"
                : "text-gray-100",
          )}
        />

        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500">
          <span>Properties:</span>
          <span className="font-bold text-gray-300">
            {player.ownedPositions.length}
          </span>
        </div>

        {player.isInJail && (
          <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-amber-400">
            <Lock className="h-3 w-3" />
            Jail
          </span>
        )}

        {player.isBankrupt && (
          <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-rose-500">
            <Skull className="h-3 w-3" />
            Bankrupt
          </span>
        )}
      </div>
    </div>
  );
}
