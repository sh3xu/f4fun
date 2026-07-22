"use client";

import { cn } from "@/lib/cn";
import { useDeadlineRemainingMs } from "../hooks/useDeadlineRemainingMs";

interface ActionCountdownProps {
  deadlineAt: string | null | undefined;
  /** Remaining ms when the turn clock is paused for a trade. */
  pausedMs?: number | null;
  className?: string;
  urgentThresholdSecs?: number;
}

export function ActionCountdown({
  deadlineAt,
  pausedMs = null,
  className,
  urgentThresholdSecs = 5,
}: ActionCountdownProps) {
  const remainingMs = useDeadlineRemainingMs(deadlineAt, pausedMs, 250);
  if (remainingMs == null) return null;

  const remaining = Math.ceil(remainingMs / 1000);

  return (
    <p
      className={cn(
        "tabular-nums font-bold tracking-wide",
        pausedMs != null
          ? "text-slate-400"
          : remaining <= urgentThresholdSecs
            ? "text-amber-300"
            : "text-slate-500",
        className,
      )}
    >
      {pausedMs != null ? `Paused ${remaining}s` : `${remaining}s`}
    </p>
  );
}
