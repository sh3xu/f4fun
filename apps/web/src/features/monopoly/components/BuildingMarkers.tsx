import { Hotel, House } from "lucide-react";
import { cn } from "@/lib/cn";

interface BuildingMarkerProps {
  colorHex: string;
  className?: string;
  title?: string;
}

function strokeFor(colorHex: string): string {
  return `${colorHex}cc`;
}

/** Small house glyph tinted to the owner's token color. */
export function HouseMarker({
  colorHex,
  className,
  title = "House",
}: BuildingMarkerProps) {
  return (
    <span title={title} className="inline-flex shrink-0 leading-none">
      <House
        aria-hidden
        className={cn(
          "h-2.5 w-2.5 stroke-[1.5]",
          "drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]",
          className,
        )}
        style={{ fill: colorHex, stroke: strokeFor(colorHex) }}
      />
    </span>
  );
}

/** Small hotel glyph tinted to the owner's token color. */
export function HotelMarker({
  colorHex,
  className,
  title = "Hotel",
}: BuildingMarkerProps) {
  return (
    <span title={title} className="inline-flex shrink-0 leading-none">
      <Hotel
        aria-hidden
        className={cn(
          "h-3 w-3 stroke-[1.5]",
          "drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]",
          className,
        )}
        style={{ fill: colorHex, stroke: strokeFor(colorHex) }}
      />
    </span>
  );
}
