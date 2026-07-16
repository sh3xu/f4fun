import type { GameEvent } from "@f4fun/monopoly-engine";

/** Batches that include a dice roll also drive token animation — toast after settle. */
export function shouldDeferGameEventToasts(events: GameEvent[]): boolean {
  return events.some((e) => e.type === "DICE_ROLLED");
}

export function areAnimationsSettled(
  diceAnimationComplete: boolean,
  pendingType: "dice" | "move" | "none",
): boolean {
  return diceAnimationComplete && pendingType === "none";
}
