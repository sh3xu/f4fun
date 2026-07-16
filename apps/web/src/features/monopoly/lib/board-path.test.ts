import { describe, expect, it } from "vitest";
import { buildBoardPath, hopCount, jailSlideDirection } from "./board-path";

describe("buildBoardPath", () => {
  it("builds a forward path wrapping past Go", () => {
    expect(buildBoardPath(38, 2)).toEqual([39, 0, 1, 2]);
  });

  it("builds a backward path from Go To Jail to Jail without passing Go", () => {
    const path = buildBoardPath(30, 10, "backward");
    expect(path[0]).toBe(29);
    expect(path.at(-1)).toBe(10);
    expect(path).not.toContain(0);
    expect(path).toHaveLength(20);
  });

  it("returns empty path when from equals to", () => {
    expect(buildBoardPath(10, 10, "backward")).toEqual([]);
  });
});

describe("hopCount", () => {
  it("counts forward hops", () => {
    expect(hopCount(30, 10, "forward")).toBe(20);
  });

  it("counts backward hops for go-to-jail", () => {
    expect(hopCount(30, 10, "backward")).toBe(20);
  });

  it("counts shorter backward distance when applicable", () => {
    expect(hopCount(15, 10, "backward")).toBe(5);
    expect(hopCount(15, 10, "forward")).toBe(35);
  });
});

describe("jailSlideDirection", () => {
  it("uses forward from positions before jail so the path does not wrap past Go", () => {
    expect(jailSlideDirection(5, 10)).toBe("forward");
    expect(jailSlideDirection(0, 10)).toBe("forward");
    expect(jailSlideDirection(9, 10)).toBe("forward");
    const path = buildBoardPath(5, 10, jailSlideDirection(5, 10));
    expect(path).toEqual([6, 7, 8, 9, 10]);
    expect(path).not.toContain(39);
  });

  it("uses backward from positions after jail so the path does not pass Go", () => {
    expect(jailSlideDirection(30, 10)).toBe("backward");
    expect(jailSlideDirection(15, 10)).toBe("backward");
    expect(jailSlideDirection(39, 10)).toBe("backward");
    const path = buildBoardPath(30, 10, jailSlideDirection(30, 10));
    expect(path).not.toContain(0);
  });
});
