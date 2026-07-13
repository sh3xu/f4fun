"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { buildBoardPath, hopCount } from "@/features/monopoly/lib/board-path";
import { cn } from "@/lib/cn";

const MAX_MOVE_MS = 2800;
const MIN_HOP_MS = 120;
const MAX_HOP_MS = 220;

interface PieceMoverProps {
  playerId: string;
  token: string;
  name: string;
  fromPosition: number;
  toPosition: number;
  colorHex?: string;
  isActive?: boolean;
  getTileCenter: (position: number) => { x: number; y: number } | null;
  onStep?: (position: number) => void;
  onAnimationComplete?: () => void;
}

/**
 * GSAP tile-by-tile hop along the board path. Requires a parent positioned over the grid.
 */
export function PieceMover({
  token,
  name,
  fromPosition,
  toPosition,
  colorHex,
  isActive = false,
  getTileCenter,
  onStep,
  onAnimationComplete,
}: PieceMoverProps) {
  const pieceRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const getTileCenterRef = useRef(getTileCenter);
  const onStepRef = useRef(onStep);
  const onCompleteRef = useRef(onAnimationComplete);

  getTileCenterRef.current = getTileCenter;
  onStepRef.current = onStep;
  onCompleteRef.current = onAnimationComplete;

  useEffect(() => {
    const el = pieceRef.current;
    if (!el) return;

    completedRef.current = false;
    const path = buildBoardPath(fromPosition, toPosition);
    const start = getTileCenterRef.current(fromPosition);

    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onStepRef.current?.(toPosition);
      onCompleteRef.current?.();
    };

    if (!start) {
      finish();
      return;
    }

    gsap.set(el, { x: start.x, y: start.y, xPercent: -50, yPercent: -50 });

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || path.length === 0) {
      const end = getTileCenterRef.current(toPosition) ?? start;
      gsap.set(el, { x: end.x, y: end.y });
      finish();
      return;
    }

    const hops = hopCount(fromPosition, toPosition) || path.length;
    const hopDuration = Math.min(
      MAX_HOP_MS / 1000,
      Math.max(MIN_HOP_MS / 1000, MAX_MOVE_MS / 1000 / hops),
    );

    // NOTE: GSAP timeline for multi-hop path; Framer would fight per-step callbacks
    const tl = gsap.timeline({ onComplete: finish });

    for (const position of path) {
      const center = getTileCenterRef.current(position);
      if (!center) continue;
      tl.to(el, {
        x: center.x,
        y: center.y,
        duration: hopDuration * 0.55,
        ease: "power2.out",
        onStart: () => {
          onStepRef.current?.(position);
        },
      });
      tl.to(el, {
        y: center.y - 10,
        scale: 1.15,
        duration: hopDuration * 0.2,
        ease: "power2.out",
      });
      tl.to(el, {
        y: center.y,
        scale: 1,
        duration: hopDuration * 0.25,
        ease: "bounce.out",
      });
    }

    return () => {
      tl.kill();
    };
  }, [fromPosition, toPosition]);

  return (
    <div
      ref={pieceRef}
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-40",
        isActive && "z-50",
      )}
      title={name}
    >
      <Avatar
        avatarId={token}
        size="xs"
        isActive={isActive}
        backgroundColor={colorHex}
      />
    </div>
  );
}
