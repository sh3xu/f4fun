"use client";

import { useDeadlineRemainingMs } from "../hooks/useDeadlineRemainingMs";

interface RaiseCashBannerProps {
  amountNeeded: number;
  deadlineAt: string | null | undefined;
  deadlinePausedMs: number | null | undefined;
  isDebtor: boolean;
}

export function RaiseCashBanner({
  amountNeeded,
  deadlineAt,
  deadlinePausedMs,
  isDebtor,
}: RaiseCashBannerProps) {
  const remainingMs = useDeadlineRemainingMs(deadlineAt, deadlinePausedMs);
  const seconds = remainingMs == null ? null : Math.ceil(remainingMs / 1000);

  return (
    <div className="rounded-xl border border-rose-400/40 bg-rose-950/80 px-4 py-3 text-center shadow-lg backdrop-blur-sm">
      <p className="text-sm font-bold text-rose-200">
        {isDebtor ? "You must raise cash" : "Player raising cash"}
      </p>
      <p className="mt-1 text-lg font-bold text-white">Need ${amountNeeded}</p>
      {seconds != null && (
        <p className="mt-1 text-xs text-rose-200/90">
          {isDebtor
            ? `Click a property to mortgage or sell — ${seconds}s remaining`
            : `${seconds}s remaining`}
        </p>
      )}
    </div>
  );
}
