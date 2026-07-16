import { applyAction, createInitialState } from "@f4fun/monopoly-engine";
import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "./gameStore";

function seededRng(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("gameStore animation gating", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it("keeps BUY_OR_DECLINE locked until dice then move animations settle", () => {
    const initial = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    // NOTE: Engine mutates state in place — snapshot a clone so prev positions stay pre-roll.
    useGameStore.getState().setFromSnapshot(structuredClone(initial));

    useGameStore.getState().startDiceRoll();
    expect(useGameStore.getState().diceAnimationComplete).toBe(false);

    const roll = applyAction(
      structuredClone(initial),
      { type: "ROLL_DICE" },
      seededRng([0.2, 0.4]),
    );
    expect(roll.error).toBeUndefined();
    expect(roll.state.phase).toBe("BUY_OR_DECLINE");
    expect(roll.events.some((e) => e.type === "DICE_ROLLED")).toBe(true);

    useGameStore.getState().applyServerUpdate(roll.state, roll.events);

    let store = useGameStore.getState();
    expect(store.pendingAnimation.type).toBe("dice");
    expect(store.diceAnimationComplete).toBe(false);
    expect(store.rollAnimationKey).toBeGreaterThan(0);

    // Property card gate: must not settle yet
    expect(
      store.diceAnimationComplete && store.pendingAnimation.type === "none",
    ).toBe(false);

    useGameStore.getState().completeDiceAnimation();
    store = useGameStore.getState();
    expect(store.pendingAnimation.type).toBe("move");
    expect(store.diceAnimationComplete).toBe(false);

    useGameStore.getState().completeMoveAnimation();
    store = useGameStore.getState();
    expect(store.pendingAnimation.type).toBe("none");
    expect(store.diceAnimationComplete).toBe(true);
  });

  it("BUG repro: setFromSnapshot after roll wipes dice pending and unlocks UI", () => {
    const initial = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    useGameStore.getState().setFromSnapshot(initial);
    useGameStore.getState().startDiceRoll();

    const roll = applyAction(
      initial,
      { type: "ROLL_DICE" },
      seededRng([0.2, 0.4]),
    );
    useGameStore.getState().applyServerUpdate(roll.state, roll.events);
    expect(useGameStore.getState().pendingAnimation.type).toBe("dice");

    // Simulates game:rejoin → stateSnapshot mid-animation
    useGameStore.getState().setFromSnapshot(roll.state);

    const store = useGameStore.getState();
    expect(store.state?.phase).toBe("BUY_OR_DECLINE");
    expect(store.pendingAnimation.type).toBe("none");
    expect(store.diceAnimationComplete).toBe(true);
    // This is the early property-card unlock the UI currently hits
    expect(
      store.diceAnimationComplete && store.pendingAnimation.type === "none",
    ).toBe(true);
  });

  it("slides backward to jail after landing on Go To Jail", () => {
    const initial = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    // Position 24 + roll 6 (non-doubles) lands on Go To Jail (30)
    initial.players.p1.position = 24;
    useGameStore.getState().setFromSnapshot(structuredClone(initial));

    // faces: floor(0.2*6)+1=2, floor(0.5*6)+1=4 → sum 6
    const goToJail = applyAction(
      structuredClone(initial),
      { type: "ROLL_DICE" },
      seededRng([0.2, 0.5]),
    );
    expect(goToJail.error).toBeUndefined();
    expect(goToJail.events.some((e) => e.type === "SENT_TO_JAIL")).toBe(true);

    useGameStore.getState().applyServerUpdate(goToJail.state, goToJail.events);
    let store = useGameStore.getState();
    expect(store.pendingAnimation.toPosition).toBe(30);
    expect(store.pendingAnimation.moveDirection).toBe("forward");
    expect(store.pendingAnimation.nextMove?.moveDirection).toBe("backward");
    expect(store.pendingAnimation.nextMove?.toPosition).toBe(10);

    useGameStore.getState().completeDiceAnimation();
    useGameStore.getState().completeMoveAnimation();
    store = useGameStore.getState();
    expect(store.pendingAnimation.type).toBe("move");
    expect(store.pendingAnimation.moveMode).toBe("slide");
    expect(store.pendingAnimation.moveDirection).toBe("backward");
    expect(store.pendingAnimation.fromPosition).toBe(30);
    expect(store.pendingAnimation.toPosition).toBe(10);
  });
});
