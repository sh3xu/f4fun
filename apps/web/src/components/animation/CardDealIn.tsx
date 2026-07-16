"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardDealInProps {
  children: ReactNode;
  className?: string;
  dealKey?: string | number;
}

/** Slide-from-deck entrance for buy prompts and trade cards. */
export function CardDealIn({
  children,
  className,
  dealKey = 0,
}: CardDealInProps) {
  return (
    <div key={dealKey} className={cn("animate-card-deal", className)}>
      {children}
    </div>
  );
}
