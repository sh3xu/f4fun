"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardFlipProps {
  children: ReactNode;
  className?: string;
  /** Remount key to replay flip when card content changes. */
  flipKey?: string | number;
}

/** Flip-reveal entrance for Chance / Community Chest cards. */
export function CardFlip({ children, className, flipKey = 0 }: CardFlipProps) {
  return (
    <div
      key={flipKey}
      className={cn(
        "origin-center animate-card-flip [perspective:800px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
