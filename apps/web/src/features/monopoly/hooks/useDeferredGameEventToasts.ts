"use client";

import type { GameEvent } from "@f4fun/monopoly-engine";
import { useEffect, useRef } from "react";
import { areAnimationsSettled } from "../lib/deferred-toasts";
import { useGameStore } from "../store/gameStore";

/**
 * Flushes deferred game events after dice/move animations settle.
 * Call the returned function only for non-deferred batches (when
 * applyServerUpdate returns false).
 */
export function useDeferredGameEventToasts(
  onEvent: (event: GameEvent) => void,
): void {
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
}
