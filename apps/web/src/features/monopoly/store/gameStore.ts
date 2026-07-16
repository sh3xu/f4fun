import {
  type GameEvent,
  type GameState,
  GO_TO_JAIL_POSITION,
  JAIL_POSITION,
  lookupCard,
  MOVEMENT_EFFECT_KINDS,
} from "@f4fun/monopoly-engine";
import { create } from "zustand";
import type {
  PieceMoveDirection,
  PieceMoveMode,
} from "@/components/animation/PieceMover";
import { jailSlideDirection } from "@/features/monopoly/lib/board-path";

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

function deckForCardId(cardId: string): "chance" | "community_chest" {
  return cardId.startsWith("cc_") ? "community_chest" : "chance";
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

  // Land on Go To Jail: hop along the dice path to 30, then slide to jail without crossing Go
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
        moveDirection: jailSlideDirection(GO_TO_JAIL_POSITION),
      },
    };
  }

  // 3 doubles (or other direct jail): slide to jail without wrapping across Go
  if (sentToJail && diceEvent.newPosition === JAIL_POSITION) {
    return {
      ...base,
      fromPosition,
      toPosition: JAIL_POSITION,
      moveMode: "slide",
      moveDirection: jailSlideDirection(fromPosition),
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

function cardMoveStyle(
  cardId: string,
  fromPosition: number,
  sentToJail: boolean,
): { moveMode: PieceMoveMode; moveDirection: PieceMoveDirection } {
  if (sentToJail) {
    return {
      moveMode: "slide",
      moveDirection: jailSlideDirection(fromPosition),
    };
  }
  const card = lookupCard(deckForCardId(cardId), cardId);
  if (card?.effect.kind === "go_back_spaces") {
    return { moveMode: "hop", moveDirection: "backward" };
  }
  return { moveMode: "hop", moveDirection: "forward" };
}

/**
 * Animate token after Chance/CC movement. If a dice hop is still in flight
 * (e.g. timeout ACK mid-animation), chain the card move as nextMove so the
 * token never settles on the Chance tile while state already moved on.
 */
function mergeCardMoveAnimation(
  existing: PendingAnimation,
  playerId: string,
  toPosition: number,
  displayPositions: Record<string, number>,
  prevPos: number,
  cardId: string,
  sentToJail: boolean,
): PendingAnimation {
  if (
    existing.type !== "none" &&
    existing.playerId === playerId &&
    existing.toPosition !== undefined
  ) {
    const chainFrom = existing.nextMove?.toPosition ?? existing.toPosition;
    if (chainFrom === toPosition) {
      return existing;
    }
    const style = cardMoveStyle(cardId, chainFrom, sentToJail);
    return {
      ...existing,
      nextMove: {
        fromPosition: chainFrom,
        toPosition,
        moveMode: style.moveMode,
        moveDirection: style.moveDirection,
      },
    };
  }

  const fromPosition = displayPositions[playerId] ?? prevPos;
  if (fromPosition === toPosition) {
    return { type: "none" };
  }
  const style = cardMoveStyle(cardId, fromPosition, sentToJail);
  return {
    type: "move",
    playerId,
    fromPosition,
    toPosition,
    moveMode: style.moveMode,
    moveDirection: style.moveDirection,
  };
}

function isAnimatingPlayer(
  pending: PendingAnimation,
  playerId: string,
): boolean {
  return pending.type !== "none" && pending.playerId === playerId;
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
    const cardApplied = events.find(
      (e): e is Extract<GameEvent, { type: "CARD_APPLIED" }> =>
        e.type === "CARD_APPLIED",
    );

    let pendingAnimation = get().pendingAnimation;
    const displayPositions = { ...get().displayPositions };
    let startedCardMove = false;

    if (diceEvent) {
      pendingAnimation = buildDicePendingAnimation(
        events,
        diceEvent,
        prev.players[diceEvent.playerId]?.position ?? 0,
      );
    } else if (cardApplied) {
      const playerId = cardApplied.playerId;
      const toPosition = state.players[playerId]?.position;
      const prevPos = prev.players[playerId]?.position ?? 0;
      const visualPos = displayPositions[playerId] ?? prevPos;
      const sentToJail = events.some((e) => e.type === "SENT_TO_JAIL");
      const card = lookupCard(
        deckForCardId(cardApplied.cardId),
        cardApplied.cardId,
      );
      const isMovementCard =
        sentToJail ||
        (card !== undefined && MOVEMENT_EFFECT_KINDS.has(card.effect.kind));

      // NOTE: Compare to visual token pos, not only prev.position — covers mid-hop
      // ACK (timeout) where authoritative state already moved.
      if (
        toPosition !== undefined &&
        isMovementCard &&
        (toPosition !== visualPos || sentToJail)
      ) {
        pendingAnimation = mergeCardMoveAnimation(
          pendingAnimation,
          playerId,
          toPosition,
          displayPositions,
          prevPos,
          cardApplied.cardId,
          sentToJail,
        );
        startedCardMove = pendingAnimation.type !== "none";
      }
    }

    for (const player of Object.values(state.players)) {
      if (diceEvent && player.id === diceEvent.playerId) {
        displayPositions[player.id] =
          prev.players[diceEvent.playerId]?.position ?? player.position;
      } else if (
        // Fresh card move (not chained onto an in-flight dice hop)
        startedCardMove &&
        player.id === cardApplied?.playerId &&
        pendingAnimation.type === "move" &&
        pendingAnimation.nextMove === undefined &&
        pendingAnimation.fromPosition !== undefined
      ) {
        displayPositions[player.id] = pendingAnimation.fromPosition;
      } else if (isAnimatingPlayer(pendingAnimation, player.id)) {
        // Mid-animation / chained card move: leave displayPositions alone
      } else {
        displayPositions[player.id] = player.position;
      }
    }

    set({
      state,
      displayPositions,
      lastEvents: events,
      pendingAnimation,
      diceAnimationComplete:
        diceEvent || startedCardMove ? false : get().diceAnimationComplete,
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

    // Promote follow-up move (e.g. Go To Jail hop → slide, or Chance hop → card destination)
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
