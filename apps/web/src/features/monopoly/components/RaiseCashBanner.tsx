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
    <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-center shadow-md">
      <p className="text-sm font-bold text-rose-800">
        {isDebtor ? "You must raise cash" : "Player raising cash"}
      </p>
      <p className="mt-1 text-lg font-bold text-slate-900">
        Need ${amountNeeded}
      </p>
      {isDebtor && (
        <p className="mt-1 text-xs text-rose-700">
          Tap your properties to mortgage, sell, or auction
        </p>
      )}
      {seconds != null && (
        <p className="mt-1 text-xs text-rose-700">{seconds}s remaining</p>
      )}
    </div>
  );
}
