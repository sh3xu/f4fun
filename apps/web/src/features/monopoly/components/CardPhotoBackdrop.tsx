import { cn } from "@/lib/cn";
import { PropertyCoverImage } from "./PropertyCoverImage";

interface CardPhotoBackdropProps {
  src: string;
  /** Soft veil so card text stays readable over the blur. */
  veil?: "light" | "strong";
  /** `tile` = tighter blur for board cells; `card` = soft full-card wash. */
  density?: "card" | "tile";
  className?: string;
}

/**
 * Blurred property art layer for GameCard / board tiles.
 * Reduced motion: lighter blur / no scale stretch.
 */
export function CardPhotoBackdrop({
  src,
  veil = "light",
  density = "card",
  className,
}: CardPhotoBackdropProps) {
  const isTile = density === "tile";

  return (
    <div className={cn("absolute inset-0", className)} aria-hidden>
      <PropertyCoverImage
        src={src}
        alt=""
        sizes={isTile ? "96px" : "420px"}
        className={
          isTile
            ? "scale-105 saturate-110 blur-[1px] opacity-95 motion-reduce:scale-100 motion-reduce:blur-none"
            : "scale-125 saturate-125 blur-2xl motion-reduce:scale-100 motion-reduce:blur-md"
        }
      />
      <div
        className={cn(
          "absolute inset-0",
          isTile
            ? "bg-gradient-to-br from-white/30 via-white/22 to-white/28"
            : veil === "strong"
              ? "bg-gradient-to-b from-white/75 via-white/88 to-white/94"
              : "bg-gradient-to-b from-white/50 via-white/72 to-white/88",
        )}
      />
    </div>
  );
}
