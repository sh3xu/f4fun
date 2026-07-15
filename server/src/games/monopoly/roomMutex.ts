const tails = new Map<string, Promise<unknown>>();

/** Serialize all game mutations for a room (handlers + deadline timers). */
export function withRoomLock<T>(
  roomId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = tails.get(roomId) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  tails.set(
    roomId,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}
