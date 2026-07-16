"use client";

import { useEffect, useState } from "react";

function computeRemainingMs(
  deadlineAt: string | null | undefined,
  pausedMs: number | null | undefined,
): number | null {
  if (pausedMs != null) return Math.max(0, pausedMs);
  if (!deadlineAt) return null;
  return Math.max(0, new Date(deadlineAt).getTime() - Date.now());
}

/** Shared deadline remaining ms — sync initial value, then poll while running. */
export function useDeadlineRemainingMs(
  deadlineAt: string | null | undefined,
  pausedMs: number | null | undefined = null,
  pollMs = 100,
): number | null {
  const [remainingMs, setRemainingMs] = useState<number | null>(() =>
    computeRemainingMs(deadlineAt, pausedMs),
  );

  useEffect(() => {
    if (pausedMs != null) {
      setRemainingMs(Math.max(0, pausedMs));
      return;
    }
    if (!deadlineAt) {
      setRemainingMs(null);
      return;
    }

    const tick = () => {
      setRemainingMs(Math.max(0, new Date(deadlineAt).getTime() - Date.now()));
    };
    tick();
    const id = window.setInterval(tick, pollMs);
    return () => window.clearInterval(id);
  }, [deadlineAt, pausedMs, pollMs]);

  return remainingMs;
}
