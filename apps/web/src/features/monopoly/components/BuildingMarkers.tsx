import { Hotel, House } from "lucide-react";
import { cn } from "@/lib/cn";

interface BuildingMarkerProps {
  className?: string;
  title?: string;
}

/** Outlined black house glyph with optional count (Issue #53). */
export function HouseMarker({
  count = 1,
  className,
  title,
}: BuildingMarkerProps & { count?: number }) {
  const label = title ?? (count === 1 ? "1 house" : `${count} houses`);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 leading-none",
        className,
      )}
    >
      <House
        aria-hidden
        className="h-2.5 w-2.5 fill-none stroke-black stroke-[1.75] drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)]"
      />
      {count > 1 && (
        <span className="text-[8px] font-bold leading-none text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.45)]">
          ×{count}
        </span>
      )}
    </span>
  );
}

/** Outlined black hotel glyph (Issue #53). */
export function HotelMarker({
  className,
  title = "Hotel",
}: BuildingMarkerProps) {
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      className={cn("inline-flex shrink-0 leading-none", className)}
    >
      <Hotel
        aria-hidden
        className="h-3 w-3 fill-none stroke-black stroke-[1.75] drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)]"
      />
    </span>
  );
}
