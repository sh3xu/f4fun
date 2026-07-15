"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface TurnTimerRingProps {
  deadlineAt: string | null | undefined;
  pausedMs?: number | null;
  /** Full duration for this phase (seconds); drives ring progress. */
  durationSecs: number | null;
  className?: string;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Lerp green (#22c55e) → red (#ef4444) as progress falls from 1 → 0. */
function ringColor(progress: number): string {
  const t = 1 - clamp01(progress);
  const r = Math.round(34 + (239 - 34) * t);
  const g = Math.round(197 + (68 - 197) * t);
  const b = Math.round(94 + (68 - 94) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function useRemainingMs(
  deadlineAt: string | null | undefined,
  pausedMs: number | null | undefined,
): number | null {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

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
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [deadlineAt, pausedMs]);

  return remainingMs;
}

/** Circular green→red countdown ring with a clock icon — replaces the Active badge. */
export function TurnTimerRing({
  deadlineAt,
  pausedMs = null,
  durationSecs,
  className,
}: TurnTimerRingProps) {
  const remainingMs = useRemainingMs(deadlineAt, pausedMs);
  const totalMs =
    durationSecs != null && durationSecs > 0 ? durationSecs * 1000 : null;

  const progress =
    remainingMs == null || totalMs == null ? 1 : clamp01(remainingMs / totalMs);
  const color = ringColor(progress);
  const size = 28;
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const isPaused = pausedMs != null;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={
        remainingMs == null
          ? "Active turn"
          : isPaused
            ? `Turn paused, ${Math.ceil(remainingMs / 1000)} seconds left`
            : `${Math.ceil(remainingMs / 1000)} seconds left`
      }
      role="timer"
    >
      <svg
        width={size}
        height={size}
        className={cn("-rotate-90", isPaused && "opacity-50")}
        role="presentation"
        focusable="false"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="motion-safe:transition-[stroke-dashoffset,stroke] motion-safe:duration-100"
        />
      </svg>
      <Clock
        className="absolute h-3 w-3"
        style={{ color }}
        strokeWidth={2.5}
        aria-hidden
      />
    </div>
  );
}
