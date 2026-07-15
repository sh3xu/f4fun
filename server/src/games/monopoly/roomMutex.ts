const tails = new Map<string, Promise<unknown>>();

/** Serialize all game mutations for a room (handlers + deadline timers). */
export function withRoomLock<T>(
  roomId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = tails.get(roomId) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  // Keep the map pointed at the settled placeholder so the chain continues.
  const settled = run.then(
    () => undefined,
    () => undefined,
  );
  tails.set(roomId, settled);

  // NOTE: Drop the entry once this branch finishes if nothing newer was queued.
  void settled.finally(() => {
    if (tails.get(roomId) === settled) {
      tails.delete(roomId);
    }
  });

  return run;
}

export function clearRoomLock(roomId: string): void {
  tails.delete(roomId);
}
