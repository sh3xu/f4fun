"use client";

import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface DiceRollerProps {
  dice: [number, number] | null;
  onComplete?: () => void;
  animate?: boolean;
  rollKey?: number;
  className?: string;
}

/** Tumble duration after backend result arrives, before faces settle. */
const ROLL_DURATION_S = 2;
const SETTLE_DURATION_S = 0.35;

const diceFaces: Record<number, string[][]> = {
  1: [
    ["", "", ""],
    ["", "●", ""],
    ["", "", ""],
  ],
  2: [
    ["●", "", ""],
    ["", "", ""],
    ["", "", "●"],
  ],
  3: [
    ["●", "", ""],
    ["", "●", ""],
    ["", "", "●"],
  ],
  4: [
    ["●", "", "●"],
    ["", "", ""],
    ["●", "", "●"],
  ],
  5: [
    ["●", "", "●"],
    ["", "●", ""],
    ["●", "", "●"],
  ],
  6: [
    ["●", "", "●"],
    ["●", "", "●"],
    ["●", "", "●"],
  ],
};

const faceRotations: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  6: { x: 180, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  2: { x: -90, y: 0 },
  5: { x: 90, y: 0 },
};

function DiceFace({ value, transform }: { value: number; transform: string }) {
  const face = diceFaces[value] || diceFaces[1];
  const isOne = value === 1;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center rounded-[18%] border border-slate-300 bg-gradient-to-br from-white to-slate-100 p-[12%] shadow-md backface-hidden"
      style={{
        transform,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      <div className="grid h-full w-full grid-rows-3 gap-[8%]">
        {face.map((row, i) => (
          <div
            key={`row-${i}-${row.join("")}`}
            className="grid grid-cols-3 gap-[8%]"
          >
            {row.map((cell, j) => (
              <div
                key={`cell-${i}-${j}-${cell}`}
                className="flex items-center justify-center"
              >
                {cell && (
                  <div
                    className={cn(
                      "aspect-square rounded-full shadow-inner",
                      isOne ? "w-[38%] bg-rose-600" : "w-[30%] bg-slate-900",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CubeDie({
  innerRef,
}: {
  innerRef: React.RefObject<HTMLDivElement | null>;
}) {
  // NOTE: translateZ uses half die size so 3D faces stay flush as the board rescales.
  const half = "calc(var(--die-size) / 2)";

  return (
    <div
      ref={innerRef}
      className="relative h-[var(--die-size)] w-[var(--die-size)]"
      style={{ transformStyle: "preserve-3d" }}
    >
      <DiceFace value={1} transform={`rotateY(0deg) translateZ(${half})`} />
      <DiceFace value={6} transform={`rotateY(180deg) translateZ(${half})`} />
      <DiceFace value={3} transform={`rotateY(90deg) translateZ(${half})`} />
      <DiceFace value={4} transform={`rotateY(-90deg) translateZ(${half})`} />
      <DiceFace value={2} transform={`rotateX(90deg) translateZ(${half})`} />
      <DiceFace value={5} transform={`rotateX(-90deg) translateZ(${half})`} />
    </div>
  );
}

function applyFace(
  el: HTMLDivElement,
  face: number,
  extras?: gsap.TweenVars,
): void {
  const rot = faceRotations[face] || faceRotations[1];
  gsap.set(el, {
    rotationX: rot.x,
    rotationY: rot.y,
    rotationZ: 0,
    x: 0,
    y: 0,
    scale: 1,
    ...extras,
  });
}

/** Animated 3D dice pair. Size follows `--die-size` from the board container. */
export function DiceRoller({
  dice,
  onComplete,
  animate = false,
  rollKey = 0,
  className,
}: DiceRollerProps) {
  const die1Ref = useRef<HTMLDivElement>(null);
  const die2Ref = useRef<HTMLDivElement>(null);
  const animatedRollKey = useRef(-1);
  const onCompleteRef = useRef(onComplete);
  // NOTE: Keep faces hidden (non-result pose) until the tumble finishes for this rollKey.
  const [revealedKey, setRevealedKey] = useState(-1);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Idle / post-reveal: show last known faces without animating.
  useEffect(() => {
    const d1 = die1Ref.current;
    const d2 = die2Ref.current;
    if (!d1 || !d2) return;

    if (!dice) {
      gsap.set(d1, { rotationX: 20, rotationY: 35, rotationZ: 0 });
      gsap.set(d2, { rotationX: -20, rotationY: -45, rotationZ: 0 });
      return;
    }

    if (!animate || revealedKey === rollKey) {
      applyFace(d1, dice[0]);
      applyFace(d2, dice[1]);
    }
  }, [dice, animate, rollKey, revealedKey]);

  useEffect(() => {
    const d1 = die1Ref.current;
    const d2 = die2Ref.current;
    if (!dice || !animate || !d1 || !d2) return;
    if (rollKey === animatedRollKey.current) return;

    const finish = () => {
      if (animatedRollKey.current === rollKey) return;
      animatedRollKey.current = rollKey;
      setRevealedKey(rollKey);
      applyFace(d1, dice[0]);
      applyFace(d2, dice[1]);
      onCompleteRef.current?.();
    };

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      finish();
      return;
    }

    const target1 = faceRotations[dice[0]] || faceRotations[1];
    const target2 = faceRotations[dice[1]] || faceRotations[1];

    // Start from a neutral tumble pose — do not flash the backend result first.
    gsap.set([d1, d2], { x: 0, y: 0, scale: 1, rotationZ: 0 });
    gsap.set(d1, { rotationX: 15, rotationY: -40 });
    gsap.set(d2, { rotationX: -25, rotationY: 50 });

    // NOTE: GSAP tumble runs a full 2s after backend values arrive, then settles faces.
    const spinsX1 = 720 + Math.random() * 720 + target1.x;
    const spinsY1 = 1080 + Math.random() * 720 + target1.y;
    const spinsZ1 = 360 + Math.random() * 360;
    const spinsX2 = 1080 + Math.random() * 720 + target2.x;
    const spinsY2 = 720 + Math.random() * 720 + target2.y;
    const spinsZ2 = -(360 + Math.random() * 360);

    const tl = gsap.timeline({ onComplete: finish });

    tl.to(
      d1,
      {
        rotationX: spinsX1,
        rotationY: spinsY1,
        rotationZ: spinsZ1,
        scale: 1.12,
        y: -22,
        x: -8,
        duration: ROLL_DURATION_S,
        ease: "power1.inOut",
      },
      0,
    )
      .to(
        d2,
        {
          rotationX: spinsX2,
          rotationY: spinsY2,
          rotationZ: spinsZ2,
          scale: 1.12,
          y: -22,
          x: 8,
          duration: ROLL_DURATION_S,
          ease: "power1.inOut",
        },
        0,
      )
      .to([d1, d2], {
        y: 0,
        x: 0,
        scale: 1,
        duration: SETTLE_DURATION_S * 0.4,
        ease: "bounce.out",
      })
      .to(d1, {
        rotationX: target1.x,
        rotationY: target1.y,
        rotationZ: 0,
        duration: SETTLE_DURATION_S,
        ease: "power2.inOut",
      })
      .to(
        d2,
        {
          rotationX: target2.x,
          rotationY: target2.y,
          rotationZ: 0,
          duration: SETTLE_DURATION_S,
          ease: "power2.inOut",
        },
        "<",
      );

    return () => {
      tl.kill();
    };
  }, [dice, animate, rollKey]);

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-[clamp(0.5rem,2.5cqmin,1.5rem)] py-[clamp(0.25rem,1.5cqmin,1rem)]",
        className,
      )}
      style={{
        perspective: "calc(var(--die-size) * 12)",
        // NOTE: Die edge tracks board center size via container query units.
        ["--die-size" as string]: "clamp(2rem, 11cqmin, 6.5rem)",
      }}
    >
      <CubeDie innerRef={die1Ref} />
      <CubeDie innerRef={die2Ref} />
    </div>
  );
}
