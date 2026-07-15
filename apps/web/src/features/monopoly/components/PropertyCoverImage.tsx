import Image from "next/image";
import { cn } from "@/lib/cn";

interface PropertyCoverImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}

/** Fill-parent Unsplash/property cover using next/image. */
export function PropertyCoverImage({
  src,
  alt,
  className,
  sizes = "120px",
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
