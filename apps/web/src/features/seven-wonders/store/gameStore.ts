import type { GameState, PickAction } from "@f4fun/seven-wonders-engine";
import { create } from "zustand";

interface SevenWondersStore {
  state: GameState | null;
  submittedCount: number;
  totalPlayers: number;
  error: string | null;

  setFromSnapshot: (state: GameState) => void;
  setPickProgress: (submittedCount: number, totalPlayers: number) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

export const useSevenWondersStore = create<SevenWondersStore>((set) => ({
  state: null,
  submittedCount: 0,
  totalPlayers: 0,
  error: null,

  setFromSnapshot: (state) => {
    set({
      state,
      submittedCount: Object.keys(state.pendingPicks).length,
      totalPlayers: state.turnOrder.length,
      error: null,
    });
  },

  setPickProgress: (submittedCount, totalPlayers) => {
    set({ submittedCount, totalPlayers });
  },

  setError: (message) => {
    set({ error: message });
  },

  reset: () => {
    set({
      state: null,
      submittedCount: 0,
      totalPlayers: 0,
      error: null,
    });
  },
}));

export type { PickAction };
