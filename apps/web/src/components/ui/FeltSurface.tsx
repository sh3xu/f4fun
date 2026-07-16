import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FeltSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  framed?: boolean;
  style?: CSSProperties;
}

/** Full-bleed felt table surface with optional beveled board frame. */
export function FeltSurface({
  framed = false,
  className,
  children,
  ...props
}: FeltSurfaceProps) {
  return (
    <div
      className={cn(
        "material-felt overflow-hidden",
        framed && "material-board-frame rounded-2xl",
        className,
      )}
      {...props}
    >
      <div className="relative z-[2] h-full w-full">{children}</div>
    </div>
  );
}
