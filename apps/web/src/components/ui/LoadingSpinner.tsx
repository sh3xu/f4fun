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
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
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
