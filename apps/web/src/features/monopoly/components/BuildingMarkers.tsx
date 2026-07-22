import Image from "next/image";
import { cn } from "@/lib/cn";

interface BuildingMarkerProps {
  className?: string;
  title?: string;
}

/** House glyph from public assets with optional count (Issue #53). */
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
      <Image
        src="/house.svg"
        alt=""
        width={10}
        height={10}
        unoptimized
        aria-hidden
        className="h-2.5 w-2.5 drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)]"
        draggable={false}
      />
      {count > 1 && (
        <span className="text-[8px] font-bold leading-none text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.45)]">
          ×{count}
        </span>
      )}
    </span>
  );
}

/** Hotel glyph from public assets (Issue #53). */
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
      <Image
        src="/hotel.svg"
        alt=""
        width={12}
        height={12}
        unoptimized
        aria-hidden
        className="h-3 w-3 drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)]"
        draggable={false}
      />
    </span>
  );
}
