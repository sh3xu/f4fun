"use client";

import { TILE_BY_POSITION } from "@f4fun/monopoly-engine";
import { cn } from "@/lib/cn";
import { BOARD_LABEL_CLASS, PROPERTY_COLORS } from "../theme/board-theme";
import { getTileLabelAt } from "./tile-labels";

interface PropertySwatchProps {
  position: number;
  className?: string;
  showLabel?: boolean;
}

export function propertyColorForPosition(position: number): string | null {
  const tile = TILE_BY_POSITION.get(position);
  if (!tile) return null;
  if (tile.type === "property") {
    return PROPERTY_COLORS[tile.colorGroup]?.hex ?? null;
  }
  if (tile.type === "railroad") return "#9e9e9e";
  if (tile.type === "utility") return "#0d9488";
  return null;
}

export function PropertySwatch({
  position,
  className,
  showLabel = true,
}: PropertySwatchProps) {
  const hex = propertyColorForPosition(position);

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-sm border border-slate-300"
        style={{ backgroundColor: hex ?? "rgba(255,255,255,0.2)" }}
      />
      {showLabel && (
        <span className={cn(BOARD_LABEL_CLASS, "truncate")}>
          {getTileLabelAt(position)}
        </span>
      )}
    </span>
  );
}
