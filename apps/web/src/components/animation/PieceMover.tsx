"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import {
  type BoardPathDirection,
  buildBoardPath,
  hopCount,
} from "@/features/monopoly/lib/board-path";
import { cn } from "@/lib/cn";

const MAX_MOVE_MS = 3200;
const MIN_HOP_MS = 200;
const MAX_HOP_MS = 320;
const HOP_DWELL_MS = 200;
const SLIDE_MIN_MS = 500;
const SLIDE_MAX_MS = 1400;
const SLIDE_PER_TILE_MS = 90;

export type PieceMoveMode = "hop" | "slide";
export type PieceMoveDirection = BoardPathDirection;

interface PieceMoverProps {
  playerId: string;
  token: string;
  name: string;
  fromPosition: number;
  toPosition: number;
  mode?: PieceMoveMode;
  direction?: PieceMoveDirection;
  colorHex?: string;
  isActive?: boolean;
  getTileCenter: (position: number) => { x: number; y: number } | null;
  onStep?: (position: number) => void;
  onAnimationComplete?: () => void;
}

/**
 * GSAP token travel along the board path. Hop pauses on each tile; slide is continuous.
 */
export function PieceMover({
  token,
  name,
  fromPosition,
  toPosition,
  mode = "hop",
  direction = "forward",
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
    const path = buildBoardPath(fromPosition, toPosition, direction);
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

    // NOTE: GSAP timeline for multi-hop / slide; Framer would fight per-step callbacks
    const tl = gsap.timeline({ onComplete: finish });

    if (mode === "slide") {
      const hops = hopCount(fromPosition, toPosition, direction) || path.length;
      const totalDuration = Math.min(
        SLIDE_MAX_MS / 1000,
        Math.max(SLIDE_MIN_MS / 1000, (hops * SLIDE_PER_TILE_MS) / 1000),
      );
      const segmentDuration = totalDuration / path.length;

      for (const position of path) {
        const center = getTileCenterRef.current(position);
        if (!center) continue;
        tl.to(el, {
          x: center.x,
          y: center.y,
          duration: segmentDuration,
          ease: "none",
          onStart: () => {
            onStepRef.current?.(position);
          },
        });
      }
    } else {
      const hops = hopCount(fromPosition, toPosition, direction) || path.length;
      const hopDuration = Math.min(
        MAX_HOP_MS / 1000,
        Math.max(MIN_HOP_MS / 1000, MAX_MOVE_MS / 1000 / hops),
      );
      const dwell = HOP_DWELL_MS / 1000;

      for (const position of path) {
        const center = getTileCenterRef.current(position);
        if (!center) continue;
        tl.to(el, {
          x: center.x,
          y: center.y,
          duration: hopDuration * 0.45,
          ease: "power2.out",
          onStart: () => {
            onStepRef.current?.(position);
          },
        });
        tl.to(el, {
          y: center.y - 12,
          scale: 1.18,
          duration: hopDuration * 0.2,
          ease: "power2.out",
        });
        tl.to(el, {
          y: center.y,
          scale: 1,
          duration: hopDuration * 0.25,
          ease: "bounce.out",
        });
        // Pause on the tile before the next hop
        tl.to({}, { duration: dwell });
      }
    }

    return () => {
      tl.kill();
    };
  }, [fromPosition, toPosition, mode, direction]);

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
