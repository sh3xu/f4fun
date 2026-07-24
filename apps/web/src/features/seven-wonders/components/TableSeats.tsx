"use client";

import {
  type GameState,
  getNeighborIds,
  getPlayerShields,
  getWonderById,
} from "@f4fun/seven-wonders-engine";
import { Check, Hourglass } from "lucide-react";
import { CounterTicker } from "@/components/animation/CounterTicker";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { CoinIcon, LaurelIcon, ShieldIcon } from "./icons";

function militaryScore(tokens: number[]): number {
  return tokens.reduce((sum, t) => sum + t, 0);
}

export function TableSeats({
  state,
  myPlayerId,
  onSelectPlayer,
}: {
  state: GameState;
  myPlayerId: string;
  onSelectPlayer?: (playerId: string) => void;
}) {
  const [westId, eastId] = getNeighborIds(state, myPlayerId);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {state.turnOrder.map((pid) => {
        const player = state.players[pid];
        const wonder = getWonderById(player.wonderId);
        const isMe = pid === myPlayerId;
        const hasPicked = state.pendingPicks[pid] !== undefined;
        const relation = isMe
          ? "You"
          : pid === westId
            ? "West neighbor"
            : pid === eastId
              ? "East neighbor"
              : "Rival";

        return (
          <button
            key={pid}
            type="button"
            onClick={() => onSelectPlayer?.(pid)}
            className={cn(
              "flex min-w-44 flex-1 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition",
              isMe
                ? "border-amber-300/50 bg-amber-400/10"
                : "border-white/10 bg-black/35 hover:border-amber-400/35 hover:bg-black/45",
              onSelectPlayer &&
                "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
            )}
          >
            <Avatar avatarId={player.token} size="sm" isActive={isMe} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-xs font-bold text-amber-50">
                  {player.name}
                </p>
                {state.phase === "DRAFTING" &&
                  (hasPicked ? (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                      aria-label="Pick locked in"
                    />
                  ) : (
                    <Hourglass
                      className="h-3 w-3 shrink-0 text-amber-200/40"
                      aria-label="Still choosing"
                    />
                  ))}
              </div>
              <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-amber-100/45">
                {relation} · {wonder.name.replace(/^The /, "")}
              </p>
              <div className="mt-1 flex items-center gap-2.5 text-[11px] font-bold text-amber-50">
                <span className="inline-flex items-center gap-0.5">
                  <CoinIcon className="h-3.5 w-3.5" />
                  <CounterTicker value={player.coins} prefix="" />
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <ShieldIcon className="h-3.5 w-3.5" />
                  {getPlayerShields(player)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5",
                    militaryScore(player.militaryTokens) < 0 && "text-rose-300",
                  )}
                >
                  <LaurelIcon className="h-3.5 w-3.5" />
                  {militaryScore(player.militaryTokens)}
                </span>
                <span className="ml-auto inline-flex items-center gap-0.5">
                  {getWonderById(player.wonderId).stages.map((_, i) => (
                    <span
                      key={`${pid}-stage-${i + 1}`}
                      className={cn(
                        "h-1.5 w-3 rounded-sm",
                        i < player.wonderStagesBuilt
                          ? "bg-amber-400"
                          : "bg-white/15",
                      )}
                    />
                  ))}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
