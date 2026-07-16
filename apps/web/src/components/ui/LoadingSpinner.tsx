"use client";

import { cn } from "@/lib/cn";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-8 w-8 border-2",
    md: "h-12 w-12 border-[3px]",
    lg: "h-16 w-16 border-4",
  };

  return (
    <output
      className={cn(
        "animate-spin rounded-full border-blue-600 border-t-transparent",
        sizeClasses[size],
        className,
      )}
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </output>
  );
}
