"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

export function Confetti() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) return;

    const colors = [
      "#FFD700",
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
    ];

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement("div");
      confetti.className = "absolute w-2 h-2 rounded-full";
      confetti.style.backgroundColor =
        colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.top = "-10px";
      containerRef.current?.appendChild(confetti);

      gsap.to(confetti, {
        y: window.innerHeight + 100,
        x: (Math.random() - 0.5) * 400,
        rotation: Math.random() * 720,
        opacity: 0,
        duration: 2 + Math.random() * 2,
        ease: "power2.in",
        delay: Math.random() * 0.5,
        onComplete: () => confetti.remove(),
      });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-50"
      aria-hidden="true"
    />
  );
}
