"use client";

import type { PlayerState } from "@f4fun/monopoly-engine";
import { ChevronDown, Lock, Skull } from "lucide-react";
import { useState } from "react";
import { CounterTicker } from "@/components/animation/CounterTicker";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { getPlayerColor } from "@/lib/player-colors";
import { useGameStore } from "../store/gameStore";
import { BOARD_MONEY_CLASS, MATERIAL_CARD } from "../theme/board-theme";
import { PropertySwatch } from "./PropertySwatch";
import { TurnTimerRing } from "./TurnTimerRing";

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

/** Compact player card — timer/jail/bankrupt sit on the avatar so height stays stable. */
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
  const displayCash = useGameStore(
    (s) => s.displayCash[player.id] ?? player.cash,
  );
  const showTimer = isActive && !player.isBankrupt;

  return (
    <div
      className={cn(
        "relative flex w-full flex-col gap-1 overflow-hidden rounded-xl p-2.5 select-none transition-all",
        MATERIAL_CARD,
        isActive ? "brightness-100" : "opacity-95 hover:opacity-100",
        player.isBankrupt && "opacity-40 grayscale",
      )}
      style={
        isActive && !player.isBankrupt
          ? {
              borderColor: playerColor.hex,
              boxShadow: `0 0 0 2px ${playerColor.hex}55, 0 8px 20px ${playerColor.hex}18`,
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2">
        <div className="relative h-8 w-8 shrink-0">
          <Avatar
            avatarId={player.token}
            size="sm"
            isActive={isActive}
            backgroundColor={playerColor.hex}
          />
          {showTimer && (
            <TurnTimerRing
              deadlineAt={deadlineAt}
              pausedMs={deadlinePausedMs}
              durationSecs={timerDurationSecs}
              className="absolute -top-1.5 -right-1.5"
            />
          )}
          {player.isInJail && (
            <span
              role="img"
              className="absolute -bottom-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-700 shadow-sm"
              title="In jail"
              aria-label="In jail"
            >
              <Lock className="h-2.5 w-2.5" aria-hidden />
            </span>
          )}
          {player.isBankrupt && (
            <span
              role="img"
              className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full border border-rose-300 bg-rose-50 text-rose-700 shadow-sm"
              title="Bankrupt"
              aria-label="Bankrupt"
            >
              <Skull className="h-2.5 w-2.5" aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex h-4 min-w-0 items-center gap-1 text-xs font-bold text-slate-800">
            <span className="truncate">{player.name}</span>
            {isMe && (
              <span className="shrink-0 rounded-full border border-teal-200 bg-teal-50 px-1.5 py-px text-[8px] font-semibold text-teal-700">
                you
              </span>
            )}
            {isBot && (
              <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-px text-[8px] font-bold tracking-wide text-violet-700 uppercase">
                AI
              </span>
            )}
          </div>
          <CounterTicker
            value={displayCash}
            className={cn(
              BOARD_MONEY_CLASS,
              "mt-0.5 block leading-none text-sm",
              displayCash < 200
                ? "text-rose-600"
                : displayCash > 1000
                  ? "text-emerald-600"
                  : "text-slate-900",
            )}
          />

          {player.ownedPositions.length > 0 ? (
            <button
              type="button"
              onClick={() => setPropsOpen((o) => !o)}
              className="mt-0.5 flex h-5 items-center gap-1 text-[10px] text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--material-focus-glow)]"
              aria-expanded={propsOpen}
            >
              <span>Properties:</span>
              <span className="font-bold text-slate-700">
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
            <p className="mt-0.5 flex h-5 items-center gap-1 text-[10px] text-slate-500">
              <span>Properties:</span>
              <span className="font-bold text-slate-700">0</span>
            </p>
          )}
        </div>
      </div>

      {propsOpen && player.ownedPositions.length > 0 && (
        <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto border-t border-slate-100 pt-1 text-[10px] text-slate-600">
          {player.ownedPositions.map((pos) => (
            <li key={pos}>
              <PropertySwatch position={pos} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
