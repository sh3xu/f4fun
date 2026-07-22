"use client";

import type { GameEvent } from "@f4fun/monopoly-engine";
import { useEffect, useRef } from "react";
import { areAnimationsSettled } from "../lib/deferred-toasts";
import { useGameStore } from "../store/gameStore";

/**
 * Flushes deferred game events after dice/move animations settle.
 * Passes the full batch so callers can assign unique keys in one shot.
 */
export function useDeferredGameEventToasts(
  onEvents: (events: GameEvent[]) => void,
): void {
  const onEventsRef = useRef(onEvents);
  onEventsRef.current = onEvents;

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
    if (events.length === 0) return;
    onEventsRef.current(events);
  }, [
    diceAnimationComplete,
    pendingType,
    deferredCount,
    takeDeferredToastEvents,
  ]);
}
