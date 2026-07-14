const BOARD_SIZE = 40;

/** Forward hop path from `from` to `to` (exclusive of `from`, inclusive of `to`). */
export function buildBoardPath(from: number, to: number): number[] {
  if (from === to) return [];
  const path: number[] = [];
  let pos = from;
  // Cap at one full lap to avoid infinite loops on bad input
  for (let i = 0; i < BOARD_SIZE; i++) {
    pos = (pos + 1) % BOARD_SIZE;
    path.push(pos);
    if (pos === to) break;
  }
  return path;
}

export function hopCount(from: number, to: number): number {
  return (to - from + BOARD_SIZE) % BOARD_SIZE;
}
