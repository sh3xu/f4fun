const BOARD_SIZE = 40;

export type BoardPathDirection = "forward" | "backward";

/**
 * Hop path from `from` to `to` (exclusive of `from`, inclusive of `to`).
 * Forward follows normal play; backward is used for go-to-jail slides so the
 * token does not appear to pass Go.
 */
export function buildBoardPath(
  from: number,
  to: number,
  direction: BoardPathDirection = "forward",
): number[] {
  if (from === to) return [];
  const path: number[] = [];
  let pos = from;
  const step = direction === "forward" ? 1 : -1;
  // Cap at one full lap to avoid infinite loops on bad input
  for (let i = 0; i < BOARD_SIZE; i++) {
    pos = (pos + step + BOARD_SIZE) % BOARD_SIZE;
    path.push(pos);
    if (pos === to) break;
  }
  return path;
}

export function hopCount(
  from: number,
  to: number,
  direction: BoardPathDirection = "forward",
): number {
  if (direction === "forward") {
    return (to - from + BOARD_SIZE) % BOARD_SIZE;
  }
  return (from - to + BOARD_SIZE) % BOARD_SIZE;
}
