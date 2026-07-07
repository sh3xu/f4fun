import type { RNG } from "./types.js";

export interface DiceRoll {
  dice: [number, number];
  isDoubles: boolean;
}

export function rollDice(rng: RNG): DiceRoll {
  const d1 = Math.floor(rng() * 6) + 1;
  const d2 = Math.floor(rng() * 6) + 1;
  return { dice: [d1, d2], isDoubles: d1 === d2 };
}

export function diceSum(dice: [number, number]): number {
  return dice[0] + dice[1];
}
