const PLAYER_KEY = "f4fun_player";
const ROOM_KEY = "f4fun_room";

export interface StoredPlayer {
  playerId: string;
  name: string;
  token: string;
}

export interface StoredRoom {
  roomId: string;
  roomCode: string;
  gameId?: string;
}

export function savePlayer(player: StoredPlayer): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAYER_KEY, JSON.stringify(player));
}

export function loadPlayer(): StoredPlayer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAYER_KEY);
    return raw ? (JSON.parse(raw) as StoredPlayer) : null;
  } catch {
    return null;
  }
}

export function saveRoom(room: StoredRoom): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROOM_KEY, JSON.stringify(room));
}

export function loadRoom(): StoredRoom | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ROOM_KEY);
    return raw ? (JSON.parse(raw) as StoredRoom) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PLAYER_KEY);
  localStorage.removeItem(ROOM_KEY);
}
