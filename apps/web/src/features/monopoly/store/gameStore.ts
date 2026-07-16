import {
  type GameEvent,
  type GameState,
  GO_TO_JAIL_POSITION,
  JAIL_POSITION,
} from "@f4fun/monopoly-engine";
import { create } from "zustand";
import type {
  PieceMoveDirection,
  PieceMoveMode,
} from "@/components/animation/PieceMover";

interface PendingNextMove {
  fromPosition: number;
  toPosition: number;
  moveMode: PieceMoveMode;
  moveDirection: PieceMoveDirection;
}

interface PendingAnimation {
  type: "dice" | "move" | "none";
  playerId?: string;
  dice?: [number, number];
  fromPosition?: number;
  toPosition?: number;
  moveMode?: PieceMoveMode;
  moveDirection?: PieceMoveDirection;
  nextMove?: PendingNextMove;
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

function normalizeGameState(state: GameState): GameState {
  if (state.auction === undefined) state.auction = null;
  if (!state.pendingTrades) state.pendingTrades = [];
  if (state.actionDeadlineAt === undefined) state.actionDeadlineAt = null;
  if (state.actionDeadlinePausedMs === undefined) {
    state.actionDeadlinePausedMs = null;
  }
  return state;
}

function buildDicePendingAnimation(
  events: GameEvent[],
  diceEvent: Extract<GameEvent, { type: "DICE_ROLLED" }>,
  fromPosition: number,
): PendingAnimation {
  const sentToJail = events.some((e) => e.type === "SENT_TO_JAIL");
  const base = {
    type: "dice" as const,
    playerId: diceEvent.playerId,
    dice: diceEvent.dice,
  };

  // Land on Go To Jail: hop along the dice path to 30, then slide backward to jail
  if (sentToJail && diceEvent.newPosition === GO_TO_JAIL_POSITION) {
    return {
      ...base,
      fromPosition,
      toPosition: GO_TO_JAIL_POSITION,
      moveMode: "hop",
      moveDirection: "forward",
      nextMove: {
        fromPosition: GO_TO_JAIL_POSITION,
        toPosition: JAIL_POSITION,
        moveMode: "slide",
        // NOTE: Backward so the token does not appear to pass Go (rules: do not collect $200).
        moveDirection: "backward",
      },
    };
  }

  // 3 doubles (or other direct jail): slide backward to jail without hopping around
  if (sentToJail && diceEvent.newPosition === JAIL_POSITION) {
    return {
      ...base,
      fromPosition,
      toPosition: JAIL_POSITION,
      moveMode: "slide",
      moveDirection: "backward",
    };
  }

  return {
    ...base,
    fromPosition,
    toPosition: diceEvent.newPosition,
    moveMode: "hop",
    moveDirection: "forward",
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  displayPositions: {},
  pendingAnimation: { type: "none" },
  diceAnimationComplete: true,
  rollAnimationKey: 0,
  lastEvents: [],

  setFromSnapshot: (state) => {
    const normalized = normalizeGameState(state);
    set({
      state: normalized,
      displayPositions: positionsFromState(normalized),
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
    state = normalizeGameState(state);
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
      ? buildDicePendingAnimation(
          events,
          diceEvent,
          prev.players[diceEvent.playerId]?.position ?? 0,
        )
      : get().pendingAnimation;

    // Keep the rolling player's token at fromPosition until tile hops / slides finish
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

  completeDiceAnimation: () => {
    const pending = get().pendingAnimation;
    // Ignore duplicate completes (e.g. Strict Mode / remount) once we've left the dice phase
    if (pending.type !== "dice") return;

    if (
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

    // Promote follow-up move (e.g. Go To Jail hop → slide to jail)
    if (
      pending.type === "move" &&
      pending.nextMove &&
      pending.playerId !== undefined
    ) {
      const { nextMove } = pending;
      set({
        displayPositions,
        pendingAnimation: {
          type: "move",
          playerId: pending.playerId,
          dice: pending.dice,
          fromPosition: nextMove.fromPosition,
          toPosition: nextMove.toPosition,
          moveMode: nextMove.moveMode,
          moveDirection: nextMove.moveDirection,
        },
      });
      return;
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
