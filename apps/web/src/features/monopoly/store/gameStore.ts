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
  diceAnimationComplete: boolean;
  rollAnimationKey: number;
  lastEvents: GameEvent[];

  setFromSnapshot: (state: GameState) => void;
  applyServerUpdate: (state: GameState, events: GameEvent[]) => void;
  startDiceRoll: () => void;
  triggerDiceAnimation: (
    playerId: string,
    dice: [number, number],
    newPosition: number,
  ) => void;
  completeDiceAnimation: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  pendingAnimation: { type: "none" },
  diceAnimationComplete: true,
  rollAnimationKey: 0,
  lastEvents: [],

  setFromSnapshot: (state) => {
    set({
      state,
      lastEvents: [],
      pendingAnimation: { type: "none" },
      diceAnimationComplete: true,
      rollAnimationKey: 0,
    });
  },

  startDiceRoll: () => {
    set({ diceAnimationComplete: false });
  },

  applyServerUpdate: (state, events) => {
    const prev = get().state;
    if (!prev) {
      set({ state, lastEvents: events });
      return;
    }

    const diceEvent = events.find(
      (e): e is Extract<GameEvent, { type: "DICE_ROLLED" }> =>
        e.type === "DICE_ROLLED",
    );

    const pendingAnimation = diceEvent
      ? {
          type: "dice" as const,
          playerId: diceEvent.playerId,
          dice: diceEvent.dice,
          fromPosition: prev.players[diceEvent.playerId]?.position ?? 0,
          toPosition: diceEvent.newPosition,
        }
      : get().pendingAnimation;

    set({
      state,
      lastEvents: events,
      pendingAnimation,
      diceAnimationComplete: diceEvent ? false : get().diceAnimationComplete,
      rollAnimationKey: diceEvent
        ? get().rollAnimationKey + 1
        : get().rollAnimationKey,
    });
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

  completeDiceAnimation: () => {
    set({ pendingAnimation: { type: "none" }, diceAnimationComplete: true });
  },

  reset: () => {
    set({
      state: null,
      pendingAnimation: { type: "none" },
      diceAnimationComplete: true,
      rollAnimationKey: 0,
      lastEvents: [],
    });
  },
}));
