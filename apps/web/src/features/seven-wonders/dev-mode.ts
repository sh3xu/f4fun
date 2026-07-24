import { loadPlayer, type StoredPlayer } from "@/lib/player-storage";

// NOTE: Dev-only tooling — lets one browser seat and control multiple players
// so a solo developer can playtest without opening extra sessions. Activated
// by setting localStorage devMode to the secret below.
const DEV_MODE_KEY = "devMode";
const DEV_MODE_SECRET = "Dev@123";
const DEV_SEATS_KEY = "f4fun_dev_seats";

interface StoredDevSeats {
  roomCode: string;
  seats: StoredPlayer[];
}

export function isDevModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEV_MODE_KEY) === DEV_MODE_SECRET;
}

export function loadDevSeats(roomCode: string): StoredPlayer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DEV_SEATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredDevSeats;
    // NOTE: Seats from an older room are stale — a fresh room mints new ids.
    if (parsed.roomCode !== roomCode) return [];
    return parsed.seats;
  } catch {
    return [];
  }
}

export function saveDevSeat(roomCode: string, seat: StoredPlayer): void {
  if (typeof window === "undefined") return;
  const seats = loadDevSeats(roomCode);
  const next: StoredDevSeats = { roomCode, seats: [...seats, seat] };
  localStorage.setItem(DEV_SEATS_KEY, JSON.stringify(next));
}

/** Real player first, then extra dev seats — every identity this browser controls. */
export function loadControlledIdentities(roomCode: string): StoredPlayer[] {
  const real = loadPlayer();
  const seats = loadDevSeats(roomCode);
  return real ? [real, ...seats] : seats;
}
