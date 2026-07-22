"use client";

import { cn } from "@/lib/cn";
import { MATERIAL_CARD } from "../theme/board-theme";

export interface ActivityEntry {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
}

interface GameActivityFeedProps {
  entries: ActivityEntry[];
  className?: string;
}

export function GameActivityFeed({
  entries,
  className,
}: GameActivityFeedProps) {
  if (entries.length === 0) return null;

  return (
    <div className={cn(MATERIAL_CARD, "flex flex-col gap-1 p-3", className)}>
      <h2 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
        Activity
      </h2>
      <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-slate-600">
        {entries.map((entry) => (
          <li key={entry.id} className="leading-snug">
            <span className="font-semibold text-teal-700">
              {entry.playerName}
            </span>
            <span className="text-slate-400"> — </span>
            {entry.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
