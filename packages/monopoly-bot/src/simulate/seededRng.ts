import type { RNG } from "@f4fun/monopoly-engine";

export function seededRng(seed: number): RNG {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}
