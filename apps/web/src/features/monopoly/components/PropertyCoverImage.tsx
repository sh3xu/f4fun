import Image from "next/image";
import { cn } from "@/lib/cn";

interface PropertyCoverImageProps {
  src: string;
  alt: string;
  /** NOTE: Required — fill images need an accurate layout size hint for srcset. */
  sizes: string;
  className?: string;
}

/** Fill-parent property cover using next/image (local procedural SVG/PNG). */
export function PropertyCoverImage({
  src,
  alt,
  className,
  sizes,
}: PropertyCoverImageProps) {
  const isSvg = src.endsWith(".svg");
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized={isSvg}
      className={cn("object-cover", className)}
    />
  );
}
