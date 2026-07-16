/** Shared settle easing — deceleration with slight overshoot for physical pieces. */
export const MOTION_SETTLE = {
  duration: 0.32,
  ease: [0.34, 1.45, 0.64, 1] as const,
};

export const MOTION_DEAL = {
  duration: 0.38,
  ease: [0.34, 1.45, 0.64, 1] as const,
};

export function reducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Framer Motion variants for deal-in cards. */
export const dealInVariants = {
  hidden: { opacity: 0, y: -18, rotate: -4, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: MOTION_DEAL,
  },
};

export const flipInVariants = {
  hidden: { opacity: 0.4, rotateY: -90 },
  visible: {
    opacity: 1,
    rotateY: 0,
    transition: { ...MOTION_SETTLE, duration: 0.42 },
  },
};
