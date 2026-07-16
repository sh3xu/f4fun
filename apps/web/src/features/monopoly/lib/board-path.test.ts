import { describe, expect, it } from "vitest";
import { buildBoardPath, hopCount } from "./board-path";

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
