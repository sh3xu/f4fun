import { setPlayerConnected } from "./RoomManager.js";

interface GraceEntry {
  roomId: string;
  playerId: string;
  timer: ReturnType<typeof setTimeout>;
  onExpire: () => void;
}

const active = new Map<string, GraceEntry>();

function graceKey(roomId: string, playerId: string): string {
  return `${roomId}:${playerId}`;
}

export function startGrace(
  roomId: string,
  playerId: string,
  graceSecs: number,
  onExpire: () => void,
): void {
  const key = graceKey(roomId, playerId);
  const existing = active.get(key);
  if (existing) clearTimeout(existing.timer);

  const timer = setTimeout(async () => {
    active.delete(key);
    onExpire();
  }, graceSecs * 1000);

  active.set(key, { roomId, playerId, timer, onExpire });
}

export async function cancelGrace(
  roomId: string,
  playerId: string,
): Promise<void> {
  const key = graceKey(roomId, playerId);
  const entry = active.get(key);
  if (entry) {
    clearTimeout(entry.timer);
    active.delete(key);
  }
  await setPlayerConnected(roomId, playerId, true);
}

export function hasActiveGrace(roomId: string, playerId: string): boolean {
  return active.has(graceKey(roomId, playerId));
}

export function hasAnyRoomGrace(roomId: string): boolean {
  for (const entry of active.values()) {
    if (entry.roomId === roomId) return true;
  }
  return false;
}

export function cancelAllRoomGraces(roomId: string): void {
  for (const [key, entry] of active) {
    if (entry.roomId === roomId) {
      clearTimeout(entry.timer);
      active.delete(key);
    }
  }
}
