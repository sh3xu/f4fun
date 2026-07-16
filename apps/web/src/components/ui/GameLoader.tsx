"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { reducedMotion } from "@/lib/motion";
import { LoadingSpinner } from "./LoadingSpinner";

interface GameLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const SIZE = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
} as const;

/** Tumbling die loader — falls back to spinner under reduced motion. */
export function GameLoader({
  size = "md",
  className,
  label = "Loading",
}: GameLoaderProps) {
  // NOTE: Default true so SSR matches reduced-motion users (no animated-die → spinner flash).
  const [preferReduce, setPreferReduce] = useState(true);

  useEffect(() => {
    setPreferReduce(reducedMotion());
  }, []);

  if (preferReduce) {
    return <LoadingSpinner size={size} className={className} />;
  }

  return (
    <output
      className={cn("relative inline-flex", SIZE[size], className)}
      aria-label={label}
    >
      <span
        className={cn(
          "relative block h-full w-full overflow-hidden rounded-[18%] border border-slate-300",
          "bg-gradient-to-br from-white to-slate-100 shadow-md",
          "animate-dice-roll",
        )}
      >
        <span
          className="absolute inset-0 bg-cover"
          style={{ backgroundImage: "url('/materials/die-face.svg')" }}
          aria-hidden
        />
      </span>
      <span className="sr-only">{label}</span>
    </output>
  );
}
