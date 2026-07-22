"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { RailFrame } from "@/components/ui/RailFrame";
import { cn } from "@/lib/cn";

interface GameShellProps {
  board: ReactNode;
  hud: ReactNode;
  activity: ReactNode;
  roomCode?: string | null;
  tradeButton?: ReactNode;
  className?: string;
}

/**
 * Responsive game chrome: phone bottom dock, tablet/desktop side HUD.
 * Single aside instance — layout flips via breakpoints (no double-mount).
 */
export function GameShell({
  board,
  hud,
  activity,
  roomCode,
  tradeButton,
  className,
}: GameShellProps) {
  return (
    <div
      className={cn(
        "material-felt flex h-dvh max-h-dvh flex-col overflow-hidden font-sans text-slate-800 select-none",
        "md:flex-row",
        "gap-2 p-2 sm:gap-3 sm:p-3 lg:gap-4 lg:p-4",
        className,
      )}
    >
      <main
        className={cn(
          "relative z-[2] order-1 min-w-0 flex-1 [container-type:size]",
          "min-h-[min(100vw,calc(100dvh-11.5rem))] md:min-h-0",
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="aspect-square max-h-full max-w-full"
            style={{
              width: "min(100cqi, 100cqb)",
              height: "min(100cqi, 100cqb)",
            }}
          >
            {board}
          </div>
        </div>
      </main>

      <RailFrame
        as="aside"
        className={cn(
          "relative z-[3] order-2 flex w-full shrink-0 flex-col gap-2 p-2.5",
          // NOTE: Scroll the dock itself on short phones so activity never clips off-screen.
          "max-h-[min(42dvh,20rem)] min-h-0 overflow-y-auto",
          "md:z-[2] md:h-full md:max-h-none md:overflow-hidden md:w-56 md:p-3 lg:w-64 xl:w-72",
        )}
        aria-label="Players and activity"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 pb-1.5 md:pb-2.5">
          <span className="text-sm font-black tracking-wide text-teal-700">
            f4fun
          </span>
          <div className="flex items-center gap-2">
            {roomCode && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] font-bold text-teal-800">
                {roomCode}
              </div>
            )}
            {tradeButton}
          </div>
        </div>

        <p className="hidden px-0.5 text-[10px] font-bold tracking-wider text-slate-600 uppercase md:block">
          Players
        </p>

        <div
          className={cn(
            "scrollbar-none flex min-h-0 shrink gap-2 overflow-x-auto pb-0.5",
            "md:flex-1 md:flex-col md:overflow-x-hidden md:overflow-y-auto",
          )}
        >
          {hud}
        </div>

        <div className="mt-auto max-h-28 w-full shrink-0 overflow-y-auto md:max-h-none">
          {activity}
        </div>
      </RailFrame>
    </div>
  );
}

/** Shared trade CTA used in GameShell header slots. */
export function GameShellTradeButton({
  pendingCount,
  onClick,
}: {
  pendingCount: number;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={pendingCount > 0 ? "token" : "tokenGhost"}
      onClick={onClick}
      className="relative h-11 min-h-11 px-3 text-xs md:h-9 md:min-h-9"
    >
      Trade
      {pendingCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-bold text-white">
          {pendingCount}
        </span>
      )}
    </Button>
  );
}
