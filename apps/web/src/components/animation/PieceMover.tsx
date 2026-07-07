"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

interface PieceMoverProps {
  playerId: string;
  position: number;
  token: string;
  isActive: boolean;
  onAnimationComplete?: () => void;
}

export function PieceMover({
  position,
  token,
  isActive,
  onAnimationComplete,
}: PieceMoverProps) {
  const pieceRef = useRef<HTMLDivElement>(null);
  const prevPosition = useRef(position);

  useEffect(() => {
    if (!pieceRef.current || prevPosition.current === position) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      prevPosition.current = position;
      onAnimationComplete?.();
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        prevPosition.current = position;
        onAnimationComplete?.();
      },
    });

    tl.to(pieceRef.current, {
      scale: 1.3,
      duration: 0.15,
      ease: "power2.out",
    })
      .to(pieceRef.current, {
        y: -20,
        duration: 0.2,
        ease: "power2.out",
      })
      .to(pieceRef.current, {
        y: 0,
        duration: 0.2,
        ease: "bounce.out",
      })
      .to(pieceRef.current, {
        scale: 1,
        duration: 0.15,
        ease: "power2.in",
      });
  }, [position, onAnimationComplete]);

  return (
    <div
      ref={pieceRef}
      className={`absolute w-6 h-6 flex items-center justify-center text-lg transition-all z-10 ${
        isActive
          ? "ring-2 ring-blue-500 ring-offset-2 rounded-full bg-white shadow-lg"
          : ""
      }`}
      style={{
        transform: "translate(-50%, -50%)",
      }}
    >
      {token}
    </div>
  );
}
