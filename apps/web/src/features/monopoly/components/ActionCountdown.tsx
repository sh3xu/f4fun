"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface ActionCountdownProps {
  deadlineAt: string | null | undefined;
  /** Remaining ms when the turn clock is paused for a trade. */
  pausedMs?: number | null;
  className?: string;
  urgentThresholdSecs?: number;
}

export function useDeadlineSeconds(
  deadlineAt: string | null | undefined,
  pausedMs?: number | null,
): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (pausedMs != null) {
      setRemaining(Math.max(0, Math.ceil(pausedMs / 1000)));
      return;
    }

    if (!deadlineAt) {
      setRemaining(null);
      return;
    }

    const tick = () => {
      const ms = new Date(deadlineAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.ceil(ms / 1000)));
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [deadlineAt, pausedMs]);

  return remaining;
}

export function ActionCountdown({
  deadlineAt,
  pausedMs = null,
  className,
  urgentThresholdSecs = 5,
}: ActionCountdownProps) {
  const remaining = useDeadlineSeconds(deadlineAt, pausedMs);
  if (remaining == null) return null;

  return (
    <p
      className={cn(
        "tabular-nums font-bold tracking-wide",
        pausedMs != null
          ? "text-white/40"
          : remaining <= urgentThresholdSecs
            ? "text-amber-300"
            : "text-white/60",
        className,
      )}
      aria-live="polite"
    >
      {pausedMs != null ? `Paused ${remaining}s` : `${remaining}s`}
    </p>
  );
}
