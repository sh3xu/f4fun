import Image from "next/image";
import { cn } from "@/lib/cn";

interface PropertyCoverImageProps {
  src: string;
  alt: string;
  /** NOTE: Required — fill images need an accurate layout size hint for srcset. */
  sizes: string;
  className?: string;
}

/** Fill-parent Unsplash/property cover using next/image. */
export function PropertyCoverImage({
  src,
  alt,
  className,
  sizes,
}: PropertyCoverImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  );
}
