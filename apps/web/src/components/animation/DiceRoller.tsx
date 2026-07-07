"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

interface DiceRollerProps {
  dice: [number, number] | null;
  onComplete?: () => void;
  rolling?: boolean;
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
      className="absolute w-14 h-14 bg-gradient-to-br from-white to-slate-100 rounded-xl border border-slate-300 shadow-md p-2 flex flex-col justify-center items-center backface-hidden"
      style={{
        transform,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      <div className="grid grid-rows-3 gap-1 h-full w-full">
        {face.map((row, i) => (
          <div
            key={`row-${i}-${row.join("")}`}
            className="grid grid-cols-3 gap-1"
          >
            {row.map((cell, j) => (
              <div
                key={`cell-${i}-${j}-${cell}`}
                className="flex items-center justify-center"
              >
                {cell && (
                  <div
                    className={`w-2 h-2 rounded-full shadow-inner ${
                      isOne ? "bg-rose-600 w-2.5 h-2.5" : "bg-slate-900"
                    }`}
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
  return (
    <div
      ref={innerRef}
      className="w-14 h-14 relative"
      style={{
        transformStyle: "preserve-3d",
        transform: `rotateX(${initialRotation.x}deg) rotateY(${initialRotation.y}deg)`,
      }}
    >
      {/* Face 1: Front */}
      <DiceFace value={1} transform="rotateY(0deg) translateZ(28px)" />
      {/* Face 6: Back */}
      <DiceFace value={6} transform="rotateY(180deg) translateZ(28px)" />
      {/* Face 3: Right */}
      <DiceFace value={3} transform="rotateY(95deg) translateZ(28px)" />
      {/* Face 4: Left */}
      <DiceFace value={4} transform="rotateY(-95deg) translateZ(28px)" />
      {/* Face 2: Top */}
      <DiceFace value={2} transform="rotateX(95deg) translateZ(28px)" />
      {/* Face 5: Bottom */}
      <DiceFace value={5} transform="rotateX(-95deg) translateZ(28px)" />
    </div>
  );
}

export function DiceRoller({ dice, onComplete }: DiceRollerProps) {
  const die1Ref = useRef<HTMLDivElement>(null);
  const die2Ref = useRef<HTMLDivElement>(null);
  const prevDice = useRef(dice);

  useEffect(() => {
    // If we have no dice or if it hasn't changed, do not re-animate.
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

    // Generate big random spins for ultra-dynamic 3D rolling physics
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

    // Clear previous gsap animation state
    gsap.set([die1Ref.current, die2Ref.current], { x: 0, y: 0, scale: 1 });

    tl.to(
      die1Ref.current,
      {
        rotationX: spinsX1,
        rotationY: spinsY1,
        rotationZ: spinsZ1,
        scale: 1.2,
        y: -50,
        x: -15,
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
          scale: 1.2,
          y: -50,
          x: 15,
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

  // Render static 3D cubes as an elegant placeholder if there are no dice rolled yet
  if (!dice) {
    return (
      <div
        className="flex gap-6 items-center justify-center py-4"
        style={{ perspective: "1000px" }}
      >
        <CubeDie
          innerRef={die1Ref}
          value={1}
          initialRotation={{ x: 20, y: 35 }}
        />
        <CubeDie
          innerRef={die2Ref}
          value={5}
          initialRotation={{ x: -20, y: -45 }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex gap-6 items-center justify-center py-4"
      style={{ perspective: "1000px" }}
    >
      <CubeDie innerRef={die1Ref} value={dice[0]} />
      <CubeDie innerRef={die2Ref} value={dice[1]} />
    </div>
  );
}
