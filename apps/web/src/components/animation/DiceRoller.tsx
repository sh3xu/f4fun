"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface DiceRollerProps {
  dice: [number, number] | null;
  onComplete?: () => void;
  animate?: boolean;
  rollKey?: number;
  className?: string;
}

type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

/** Row-major cell indices (0-8) where pips appear for each face value. */
const PIP_CELLS: Record<DieValue, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const ALL_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
const TUMBLE_MS = 800;
const FACE_CYCLE_MS = 90;
const IDLE_FACES: [DieValue, DieValue] = [1, 1];

function clampDie(value: number): DieValue {
  if (value >= 1 && value <= 6) return value as DieValue;
  return 1;
}

function randomFace(): DieValue {
  return (Math.floor(Math.random() * 6) + 1) as DieValue;
}

function DieFace({ value, spinning }: { value: DieValue; spinning: boolean }) {
  const pipSet = new Set(PIP_CELLS[value]);
  const isOne = value === 1;

  return (
    <div
      role="img"
      className={cn(
        "grid aspect-square grid-cols-3 grid-rows-3 gap-[12%] rounded-[18%] border border-slate-300/90 p-[12%]",
        "bg-gradient-to-br from-white via-slate-50 to-slate-200",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-2px_4px_rgba(0,0,0,0.12),2px_4px_8px_rgba(0,0,0,0.35)]",
        "h-[var(--die-size)] w-[var(--die-size)]",
        spinning && "animate-dice-roll",
      )}
      style={{
        backgroundImage:
          "linear-gradient(145deg, rgba(255,255,255,0.5), transparent 50%), url('/materials/die-face.svg')",
        backgroundSize: "cover",
      }}
      aria-label={`Die showing ${value}`}
    >
      {ALL_CELLS.map((cell) => (
        <div key={cell} className="flex items-center justify-center">
          {pipSet.has(cell) ? (
            <div
              className={cn(
                "aspect-square rounded-full shadow-inner",
                isOne ? "w-[38%] bg-rose-600" : "w-[68%] bg-slate-900",
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Animated dice pair using CSS tumble and 3x3 pip grids.
 * Server `dice` is shown only after the tumble finishes (unless reduced motion).
 */
export function DiceRoller({
  dice,
  onComplete,
  animate = false,
  rollKey = 0,
  className,
}: DiceRollerProps) {
  const animatedRollKey = useRef(-1);
  const onCompleteRef = useRef(onComplete);
  const [displayFaces, setDisplayFaces] =
    useState<[DieValue, DieValue]>(IDLE_FACES);
  const [spinning, setSpinning] = useState(false);
  const [revealedKey, setRevealedKey] = useState(-1);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!dice) {
      setDisplayFaces(IDLE_FACES);
      setSpinning(false);
      return;
    }

    if (!animate || revealedKey === rollKey) {
      setDisplayFaces([clampDie(dice[0]), clampDie(dice[1])]);
      setSpinning(false);
    }
  }, [dice, animate, rollKey, revealedKey]);

  useEffect(() => {
    if (!dice || !animate) return;
    if (rollKey === animatedRollKey.current) return;

    const finish = () => {
      if (animatedRollKey.current === rollKey) return;
      animatedRollKey.current = rollKey;
      setRevealedKey(rollKey);
      setDisplayFaces([clampDie(dice[0]), clampDie(dice[1])]);
      setSpinning(false);
      onCompleteRef.current?.();
    };

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      finish();
      return;
    }

    setSpinning(true);
    setDisplayFaces([randomFace(), randomFace()]);

    const intervalId = window.setInterval(() => {
      setDisplayFaces([randomFace(), randomFace()]);
    }, FACE_CYCLE_MS);

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      finish();
    }, TUMBLE_MS);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [dice, animate, rollKey]);

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-[clamp(0.5rem,2.5cqmin,1.5rem)] py-[clamp(0.25rem,1.5cqmin,1rem)]",
        className,
      )}
      style={{
        ["--die-size" as string]: "clamp(2rem, 11cqmin, 6.5rem)",
      }}
    >
      <DieFace value={displayFaces[0]} spinning={spinning} />
      <DieFace value={displayFaces[1]} spinning={spinning} />
    </div>
  );
}
