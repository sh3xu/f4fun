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
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
        Table log
      </p>
      <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-gray-300">
        {entries.map((entry) => (
          <li key={entry.id} className="leading-snug">
            <span className="font-semibold text-violet-300">
              {entry.playerName}
            </span>
            <span className="text-gray-500"> — </span>
            {entry.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
