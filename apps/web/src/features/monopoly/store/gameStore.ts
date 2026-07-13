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
  displayPositions: Record<string, number>;
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
  setDisplayPosition: (playerId: string, position: number) => void;
  completeMoveAnimation: () => void;
  reset: () => void;
}

function positionsFromState(state: GameState): Record<string, number> {
  const positions: Record<string, number> = {};
  for (const player of Object.values(state.players)) {
    positions[player.id] = player.position;
  }
  return positions;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  displayPositions: {},
  pendingAnimation: { type: "none" },
  diceAnimationComplete: true,
  rollAnimationKey: 0,
  lastEvents: [],

  setFromSnapshot: (state) => {
    set({
      state,
      displayPositions: positionsFromState(state),
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
      set({
        state,
        displayPositions: positionsFromState(state),
        lastEvents: events,
      });
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

    // Keep the rolling player's token at fromPosition until tile hops finish
    const displayPositions = { ...get().displayPositions };
    const animatingId =
      diceEvent?.playerId ??
      (get().pendingAnimation.type !== "none"
        ? get().pendingAnimation.playerId
        : undefined);

    for (const player of Object.values(state.players)) {
      if (diceEvent && player.id === diceEvent.playerId) {
        displayPositions[player.id] =
          prev.players[diceEvent.playerId]?.position ?? player.position;
      } else if (player.id === animatingId) {
        // Mid-animation: leave displayPositions alone
      } else {
        displayPositions[player.id] = player.position;
      }
    }

    set({
      state,
      displayPositions,
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
    const pending = get().pendingAnimation;
    if (
      pending.type === "dice" &&
      pending.playerId &&
      pending.fromPosition !== undefined &&
      pending.toPosition !== undefined &&
      pending.fromPosition !== pending.toPosition
    ) {
      set({
        pendingAnimation: {
          ...pending,
          type: "move",
        },
      });
      return;
    }

    set({ pendingAnimation: { type: "none" }, diceAnimationComplete: true });
  },

  setDisplayPosition: (playerId, position) => {
    set((s) => ({
      displayPositions: { ...s.displayPositions, [playerId]: position },
    }));
  },

  completeMoveAnimation: () => {
    const pending = get().pendingAnimation;
    const displayPositions = { ...get().displayPositions };
    if (pending.playerId !== undefined && pending.toPosition !== undefined) {
      displayPositions[pending.playerId] = pending.toPosition;
    }
    set({
      displayPositions,
      pendingAnimation: { type: "none" },
      diceAnimationComplete: true,
    });
  },

  reset: () => {
    set({
      state: null,
      displayPositions: {},
      pendingAnimation: { type: "none" },
      diceAnimationComplete: true,
      rollAnimationKey: 0,
      lastEvents: [],
    });
  },
}));
