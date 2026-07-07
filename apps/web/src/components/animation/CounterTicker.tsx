"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

interface CounterTickerProps {
  value: number;
  prefix?: string;
  className?: string;
}

export function CounterTicker({
  value,
  prefix = "$",
  className,
}: CounterTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (!ref.current) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      ref.current.textContent = `${prefix}${value}`;
      prevValue.current = value;
      return;
    }

    const obj = { val: prevValue.current };

    gsap.to(obj, {
      val: value,
      duration: 0.5,
      ease: "power2.out",
      onUpdate: () => {
        if (ref.current) {
          ref.current.textContent = `${prefix}${Math.round(obj.val)}`;
        }
      },
    });

    prevValue.current = value;
  }, [value, prefix]);

  return <span ref={ref} className={className}>{`${prefix}${value}`}</span>;
}
