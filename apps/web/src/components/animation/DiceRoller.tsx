"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

interface DiceRollerProps {
  dice: [number, number] | null;
  onComplete?: () => void;
  rolling?: boolean;
  className?: string;
}

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
  initialRotation = { x: 20, y: -35 },
}: {
  innerRef: React.RefObject<HTMLDivElement | null>;
  initialRotation?: { x: number; y: number };
}) {
  // NOTE: translateZ uses half die size so 3D faces stay flush as the board rescales.
  const half = "calc(var(--die-size) / 2)";

  return (
    <div
      ref={innerRef}
      className="relative h-[var(--die-size)] w-[var(--die-size)]"
      style={{
        transformStyle: "preserve-3d",
        transform: `rotateX(${initialRotation.x}deg) rotateY(${initialRotation.y}deg)`,
      }}
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

/** Animated 3D dice pair. Size follows `--die-size` from the board container. */
export function DiceRoller({ dice, onComplete, className }: DiceRollerProps) {
  const die1Ref = useRef<HTMLDivElement>(null);
  const die2Ref = useRef<HTMLDivElement>(null);
  const prevDice = useRef(dice);

  useEffect(() => {
    if (!dice || !die1Ref.current || !die2Ref.current) return;
    if (dice[0] === prevDice.current?.[0] && dice[1] === prevDice.current?.[1])
      return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      prevDice.current = dice;
      onComplete?.();
      return;
    }

    const target1 = faceRotations[dice[0]] || faceRotations[1];
    const target2 = faceRotations[dice[1]] || faceRotations[1];

    // NOTE: GSAP for tumble physics — reduced-motion skips to final face above.
    const spinsX1 = 720 + Math.random() * 360 + target1.x;
    const spinsY1 = 1080 + Math.random() * 360 + target1.y;
    const spinsZ1 = 180 + Math.random() * 180;

    const spinsX2 = 1080 + Math.random() * 360 + target2.x;
    const spinsY2 = 720 + Math.random() * 360 + target2.y;
    const spinsZ2 = -180 - Math.random() * 180;

    const tl = gsap.timeline({
      onComplete: () => {
        prevDice.current = dice;
        onComplete?.();
      },
    });

    gsap.set([die1Ref.current, die2Ref.current], { x: 0, y: 0, scale: 1 });

    tl.to(
      die1Ref.current,
      {
        rotationX: spinsX1,
        rotationY: spinsY1,
        rotationZ: spinsZ1,
        scale: 1.15,
        y: -28,
        x: -10,
        duration: 0.7,
        ease: "power2.out",
      },
      0,
    )
      .to(
        die2Ref.current,
        {
          rotationX: spinsX2,
          rotationY: spinsY2,
          rotationZ: spinsZ2,
          scale: 1.15,
          y: -28,
          x: 10,
          duration: 0.7,
          ease: "power2.out",
        },
        0,
      )
      .to([die1Ref.current, die2Ref.current], {
        y: 0,
        x: 0,
        scale: 1,
        duration: 0.35,
        ease: "bounce.out",
      })
      .to(die1Ref.current, {
        rotationX: target1.x,
        rotationY: target1.y,
        rotationZ: 0,
        duration: 0.25,
        ease: "power2.inOut",
      })
      .to(
        die2Ref.current,
        {
          rotationX: target2.x,
          rotationY: target2.y,
          rotationZ: 0,
          duration: 0.25,
          ease: "power2.inOut",
        },
        "<",
      );
  }, [dice, onComplete]);

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-[clamp(0.5rem,2.5cqmin,1.5rem)] py-[clamp(0.25rem,1.5cqmin,1rem)]",
        className,
      )}
      style={{
        perspective: "calc(var(--die-size) * 12)",
        // NOTE: Die edge tracks board center size via container query units.
        ["--die-size" as string]: "clamp(1.75rem, 9cqmin, 3.5rem)",
      }}
    >
      <CubeDie
        innerRef={die1Ref}
        initialRotation={
          dice ? (faceRotations[dice[0]] ?? faceRotations[1]) : { x: 20, y: 35 }
        }
      />
      <CubeDie
        innerRef={die2Ref}
        initialRotation={
          dice
            ? (faceRotations[dice[1]] ?? faceRotations[5])
            : { x: -20, y: -45 }
        }
      />
    </div>
  );
}
