"use client";

import type { GameEvent } from "@f4fun/monopoly-engine";
import { useEffect, useRef } from "react";
import {
  areAnimationsSettled,
  shouldDeferGameEventToasts,
} from "../lib/deferred-toasts";
import { useGameStore } from "../store/gameStore";

/**
 * Fires game-event toasts immediately, or after dice/move animations settle
 * when the batch includes DICE_ROLLED (PASSED_GO, rent, jail, etc.).
 */
export function useDeferredGameEventToasts(
  onEvent: (event: GameEvent) => void,
): (events: GameEvent[]) => void {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const pendingType = useGameStore((s) => s.pendingAnimation.type);
  const diceAnimationComplete = useGameStore((s) => s.diceAnimationComplete);
  const deferredCount = useGameStore((s) => s.deferredToastEvents.length);
  const takeDeferredToastEvents = useGameStore(
    (s) => s.takeDeferredToastEvents,
  );

  useEffect(() => {
    if (
      deferredCount === 0 ||
      !areAnimationsSettled(diceAnimationComplete, pendingType)
    ) {
      return;
    }
    const events = takeDeferredToastEvents();
    for (const event of events) {
      onEventRef.current(event);
    }
  }, [
    diceAnimationComplete,
    pendingType,
    deferredCount,
    takeDeferredToastEvents,
  ]);

  return (events: GameEvent[]) => {
    // Deferred batches are queued inside applyServerUpdate; only toast now
    // for events that do not drive dice/token animation.
    if (shouldDeferGameEventToasts(events)) return;
    for (const event of events) {
      onEventRef.current(event);
    }
  };
}
