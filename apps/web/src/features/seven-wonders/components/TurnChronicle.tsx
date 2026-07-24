"use client";

import { ScrollText } from "lucide-react";
import { OverlayPanel } from "@/components/ui/OverlayPanel";
import { cn } from "@/lib/cn";
import type { ChronicleEntry } from "../store/gameStore";

function EventList({
  entries,
  emptyLabel,
}: {
  entries: ChronicleEntry[];
  emptyLabel: string;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-amber-100/45">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className={cn(
            "rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm leading-snug text-amber-50/90",
            entry.type === "TRADE_PAID" && "border-orange-400/20",
            entry.type === "AGE_END" && "border-amber-400/30 font-semibold",
            entry.type === "GAME_OVER" && "border-rose-400/25",
          )}
        >
          {entry.message}
        </li>
      ))}
    </ul>
  );
}

interface TurnChronicleProps {
  lastTurnEvents: ChronicleEntry[];
  chronicle: ChronicleEntry[];
  showLastTurnPanel: boolean;
  chronicleOpen: boolean;
  onDismissLastTurn: () => void;
  onCloseChronicle: () => void;
}

export function TurnChronicle({
  lastTurnEvents,
  chronicle,
  showLastTurnPanel,
  chronicleOpen,
  onDismissLastTurn,
  onCloseChronicle,
}: TurnChronicleProps) {
  return (
    <>
      <OverlayPanel
        open={showLastTurnPanel && !chronicleOpen}
        onClose={onDismissLastTurn}
        title="What just happened"
      >
        <div className="mb-3 flex items-center gap-2 text-amber-200/70">
          <ScrollText className="h-4 w-4" />
          <p className="text-xs font-semibold uppercase tracking-wider">
            End of turn
          </p>
        </div>
        <EventList
          entries={lastTurnEvents}
          emptyLabel="Nothing was recorded for this turn."
        />
      </OverlayPanel>

      <OverlayPanel
        open={chronicleOpen}
        onClose={onCloseChronicle}
        title="Chronicle"
        size="lg"
      >
        <EventList
          entries={chronicle}
          emptyLabel="The chronicle is empty — play a turn to fill it."
        />
      </OverlayPanel>
    </>
  );
}
