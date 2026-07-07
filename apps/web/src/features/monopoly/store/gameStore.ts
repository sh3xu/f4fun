import type { GameEvent, GameState } from "@f4fun/monopoly-engine";
import { create } from "zustand";

interface PendingAnimation {
  type: "dice" | "move" | "none";
  playerId?: string;
  dice?: [number, number];
  fromPosition?: number;
  toPosition?: number;
}

interface GameStore {
  state: GameState | null;
  pendingAnimation: PendingAnimation;
  lastEvents: GameEvent[];

  setFromSnapshot: (state: GameState) => void;
  applyServerUpdate: (state: GameState, events: GameEvent[]) => void;
  triggerDiceAnimation: (
    playerId: string,
    dice: [number, number],
    newPosition: number,
  ) => void;
  clearAnimation: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  pendingAnimation: { type: "none" },
  lastEvents: [],

  setFromSnapshot: (state) => {
    set({ state, lastEvents: [], pendingAnimation: { type: "none" } });
  },

  applyServerUpdate: (state, events) => {
    const prev = get().state;
    if (!prev) {
      set({ state, lastEvents: events });
      return;
    }
    set({ state, lastEvents: events });
  },

  triggerDiceAnimation: (playerId, dice, newPosition) => {
    const prev = get().state;
    const fromPosition = prev?.players[playerId]?.position ?? 0;
    set({
      pendingAnimation: {
        type: "dice",
        playerId,
        dice,
        fromPosition,
        toPosition: newPosition,
      },
    });
  },

  clearAnimation: () => {
    set({ pendingAnimation: { type: "none" } });
  },

  reset: () => {
    set({ state: null, pendingAnimation: { type: "none" }, lastEvents: [] });
  },
}));
