import { describe, expect, it } from "vitest";
import { computeScienceScore } from "../scoring.js";

describe("science scoring", () => {
  it("scores single set of 3 different symbols", () => {
    const score = computeScienceScore(1, 1, 1, 0);
    // 1^2 + 1^2 + 1^2 + 7 = 10
    expect(score).toBe(10);
  });

  it("scores 3 of one symbol", () => {
    const score = computeScienceScore(3, 0, 0, 0);
    // 9 + 0 + 0 + 0 sets = 9
    expect(score).toBe(9);
  });

  it("scores mixed symbols", () => {
    const score = computeScienceScore(3, 2, 1, 0);
    // 9 + 4 + 1 + 7 (1 set) = 21
    expect(score).toBe(21);
  });

  it("scores with one wild optimally", () => {
    const score = computeScienceScore(2, 1, 1, 1);
    // Best: add wild to compass (3,1,1) = 9+1+1+7=18
    // Or add wild to tablet (2,2,1) = 4+4+1+7=16
    // Or add wild to gear (2,1,2) = 4+1+4+7=16
    expect(score).toBe(18);
  });

  it("scores 2 wilds optimally", () => {
    const score = computeScienceScore(1, 1, 1, 2);
    // Best: (3,1,1)=18, (1,3,1)=18, (1,1,3)=18, (2,2,1)=16, etc.
    // Or (2,1,2)=16, (1,2,2)=16
    // Best is (2,2,1)=4+4+1+7=16? No wait (3,1,1)=9+1+1+7=18
    // Actually best is (2,2,1) with 7 = 16 or (3,1,1) = 18
    // But what about (2,1,2) = 16 too
    // But also try (1,2,2) = 16
    // So 18 is best from assigning both to same
    // Wait: what about (2,2,1)=16? Or (1,1,3)=18?
    // Best: 18
    expect(score).toBe(18);
  });

  it("scores zero symbols as 0", () => {
    expect(computeScienceScore(0, 0, 0, 0)).toBe(0);
  });

  it("handles large counts", () => {
    const score = computeScienceScore(4, 4, 4, 0);
    // 16 + 16 + 16 + 4*7 = 76
    expect(score).toBe(76);
  });
});
