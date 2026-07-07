import { describe, expect, it } from "vitest";
import { diceSum, rollDice } from "../dice.js";

function seededRng(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("dice", () => {
  it("rolls two dice and detects doubles", () => {
    const rng = seededRng([0.5, 0.5]);
    const result = rollDice(rng);
    expect(result.dice).toEqual([4, 4]);
    expect(result.isDoubles).toBe(true);
  });

  it("rolls two different dice", () => {
    const rng = seededRng([0.2, 0.7]);
    const result = rollDice(rng);
    expect(result.dice).toEqual([2, 5]);
    expect(result.isDoubles).toBe(false);
  });

  it("calculates dice sum correctly", () => {
    expect(diceSum([3, 4])).toBe(7);
    expect(diceSum([6, 6])).toBe(12);
    expect(diceSum([1, 1])).toBe(2);
  });
});
