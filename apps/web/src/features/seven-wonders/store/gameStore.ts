import type {
  GameEvent,
  GameState,
  PickAction,
} from "@f4fun/seven-wonders-engine";
import { create } from "zustand";

export interface ChronicleEntry {
  id: string;
  type: GameEvent["type"];
  playerId?: string;
  message: string;
}

const RESOLVE_EVENT_TYPES = new Set<GameEvent["type"]>([
  "CARD_PLAYED",
  "CARD_DISCARDED",
  "WONDER_STAGED",
  "TRADE_PAID",
  "FREE_BUILD_USED",
  "DISCARD_PLAYED",
  "ABILITY_GRANTED",
  "AGE_END",
  "GAME_OVER",
]);

let chronicleSeq = 0;

function toChronicleEntries(events: GameEvent[]): ChronicleEntry[] {
  return events.map((event) => {
    chronicleSeq += 1;
    return {
      id: `sw-evt-${chronicleSeq}`,
      type: event.type,
      playerId: event.playerId,
      message: event.message,
    };
  });
}

interface SevenWondersStore {
  state: GameState | null;
  submittedCount: number;
  totalPlayers: number;
  error: string | null;
  lastTurnEvents: ChronicleEntry[];
  chronicle: ChronicleEntry[];
  chronicleOpen: boolean;
  showLastTurnPanel: boolean;

  setFromSnapshot: (state: GameState, events?: GameEvent[]) => void;
  setPickProgress: (submittedCount: number, totalPlayers: number) => void;
  setError: (message: string | null) => void;
  setChronicleOpen: (open: boolean) => void;
  dismissLastTurnPanel: () => void;
  reset: () => void;
}

export const useSevenWondersStore = create<SevenWondersStore>((set) => ({
  state: null,
  submittedCount: 0,
  totalPlayers: 0,
  error: null,
  lastTurnEvents: [],
  chronicle: [],
  chronicleOpen: false,
  showLastTurnPanel: false,

  setFromSnapshot: (state, events = []) => {
    const resolveEvents = events.filter((e) => RESOLVE_EVENT_TYPES.has(e.type));
    const entries = toChronicleEntries(resolveEvents);

    set((prev) => ({
      state,
      submittedCount: Object.keys(state.pendingPicks).length,
      totalPlayers: state.turnOrder.length,
      error: null,
      ...(entries.length > 0
        ? {
            lastTurnEvents: entries,
            chronicle: [...prev.chronicle, ...entries],
            showLastTurnPanel: true,
          }
        : {}),
    }));
  },

  setPickProgress: (submittedCount, totalPlayers) => {
    set({ submittedCount, totalPlayers });
  },

  setError: (message) => {
    set({ error: message });
  },

  setChronicleOpen: (open) => {
    set({ chronicleOpen: open });
  },

  dismissLastTurnPanel: () => {
    set({ showLastTurnPanel: false });
  },

  reset: () => {
    set({
      state: null,
      submittedCount: 0,
      totalPlayers: 0,
      error: null,
      lastTurnEvents: [],
      chronicle: [],
      chronicleOpen: false,
      showLastTurnPanel: false,
    });
  },
}));

export type { PickAction };
