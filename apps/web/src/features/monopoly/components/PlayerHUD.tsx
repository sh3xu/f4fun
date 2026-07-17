"use client";

import type { PlayerState } from "@f4fun/monopoly-engine";
import { ChevronDown, Lock, Skull } from "lucide-react";
import { useState } from "react";
import { CounterTicker } from "@/components/animation/CounterTicker";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { getPlayerColor } from "@/lib/player-colors";
import { BOARD_MONEY_CLASS, MATERIAL_CARD } from "../theme/board-theme";
import { TurnTimerRing } from "./TurnTimerRing";
import { getTileLabelAt } from "./tile-labels";

interface PlayerHUDProps {
  player: PlayerState;
  isActive: boolean;
  isMe: boolean;
  isBot?: boolean;
  turnOrder: string[];
  deadlineAt?: string | null;
  deadlinePausedMs?: number | null;
  timerDurationSecs?: number | null;
}

export function PlayerHUD({
  player,
  isActive,
  isMe,
  isBot,
  turnOrder,
  deadlineAt = null,
  deadlinePausedMs = null,
  timerDurationSecs = null,
}: PlayerHUDProps) {
  const playerColor = getPlayerColor(player.id, turnOrder);
  const [propsOpen, setPropsOpen] = useState(false);

  return (
    <div
      className={cn(
        "relative flex w-full flex-col gap-1 overflow-hidden rounded-lg p-3 select-none transition-all",
        MATERIAL_CARD,
        isActive
          ? "brightness-110"
          : "brightness-90 opacity-90 hover:brightness-100",
        player.isBankrupt && "opacity-40 grayscale",
      )}
      style={
        isActive && !player.isBankrupt
          ? {
              borderColor: `${playerColor.hex}70`,
              boxShadow: `0 0 14px ${playerColor.hex}25, inset 0 1px 0 rgba(255,255,255,0.08)`,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2.5">
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
            {isBot && !isMe && (
              <span className="shrink-0 rounded border border-violet-400/20 bg-violet-400/10 px-1 py-px text-[9px] font-semibold text-violet-300">
                AI
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

          {player.ownedPositions.length > 0 ? (
            <button
              type="button"
              onClick={() => setPropsOpen((o) => !o)}
              className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--material-focus-glow)]"
              aria-expanded={propsOpen}
            >
              <span>Properties:</span>
              <span className="font-bold text-gray-300">
                {player.ownedPositions.length}
              </span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  propsOpen && "rotate-180",
                )}
              />
            </button>
          ) : (
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500">
              <span>Properties:</span>
              <span className="font-bold text-gray-300">0</span>
            </p>
          )}

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

      {propsOpen && player.ownedPositions.length > 0 && (
        <ul className="mt-1 max-h-20 space-y-0.5 overflow-y-auto border-t border-white/[0.06] pt-1 text-[10px] text-white/60">
          {player.ownedPositions.map((pos) => (
            <li key={pos}>{getTileLabelAt(pos)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
