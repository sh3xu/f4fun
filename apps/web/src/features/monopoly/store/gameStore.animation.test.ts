import {
  applyAction,
  createInitialState,
  JAIL_POSITION,
} from "@f4fun/monopoly-engine";
import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "./gameStore";

function seededRng(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

function ackCardNow(state: ReturnType<typeof createInitialState>) {
  const next = structuredClone(state);
  if (next.pendingCard) {
    next.pendingCard.drawnAt = new Date(0).toISOString();
  }
  return applyAction(next, { type: "ACKNOWLEDGE_CARD" });
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
    expect(store.deferredToastEvents.length).toBeGreaterThan(0);
    expect(store.takeDeferredToastEvents()).toEqual([]);

    // Property card gate: must not settle yet
    expect(
      store.diceAnimationComplete && store.pendingAnimation.type === "none",
    ).toBe(false);

    useGameStore.getState().completeDiceAnimation();
    store = useGameStore.getState();
    expect(store.pendingAnimation.type).toBe("move");
    expect(store.diceAnimationComplete).toBe(false);
    expect(store.takeDeferredToastEvents()).toEqual([]);

    useGameStore.getState().completeMoveAnimation();
    store = useGameStore.getState();
    expect(store.pendingAnimation.type).toBe("none");
    expect(store.diceAnimationComplete).toBe(true);
    const flushed = store.takeDeferredToastEvents();
    expect(flushed.some((e) => e.type === "DICE_ROLLED")).toBe(true);
    expect(useGameStore.getState().deferredToastEvents).toEqual([]);
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
    expect(useGameStore.getState().deferredToastEvents.length).toBeGreaterThan(
      0,
    );

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
    // Deferred toasts survive the wipe so they can flush once settled
    expect(store.takeDeferredToastEvents().length).toBeGreaterThan(0);
  });

  it("does not defer toast events for non-roll updates", () => {
    const initial = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    useGameStore.getState().setFromSnapshot(structuredClone(initial));

    useGameStore.getState().applyServerUpdate(structuredClone(initial), [
      {
        type: "PROPERTY_BOUGHT",
        playerId: "p1",
        position: 1,
        price: 60,
      },
    ]);

    expect(useGameStore.getState().deferredToastEvents).toEqual([]);
  });

  it("queues roll toast events when stateUpdated arrives before any snapshot", () => {
    const initial = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    const roll = applyAction(
      structuredClone(initial),
      { type: "ROLL_DICE" },
      seededRng([0.2, 0.4]),
    );
    expect(roll.error).toBeUndefined();

    useGameStore.getState().applyServerUpdate(roll.state, roll.events);

    const store = useGameStore.getState();
    expect(store.state).not.toBeNull();
    expect(store.deferredToastEvents.length).toBeGreaterThan(0);
    // No prior positions — animation skipped; settled so toasts can flush now.
    expect(store.pendingAnimation.type).toBe("none");
    expect(store.diceAnimationComplete).toBe(true);
    expect(
      store.takeDeferredToastEvents().some((e) => e.type === "DICE_ROLLED"),
    ).toBe(true);
  });

  it("clears deferred toasts when snapshot is for a different gameId", () => {
    const gameA = createInitialState("game-a", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    useGameStore.getState().setFromSnapshot(structuredClone(gameA));

    const roll = applyAction(
      structuredClone(gameA),
      { type: "ROLL_DICE" },
      seededRng([0.2, 0.4]),
    );
    useGameStore.getState().applyServerUpdate(roll.state, roll.events);
    expect(useGameStore.getState().deferredToastEvents.length).toBeGreaterThan(
      0,
    );

    const gameB = createInitialState("game-b", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    useGameStore.getState().setFromSnapshot(gameB);

    expect(useGameStore.getState().deferredToastEvents).toEqual([]);
  });

  it("animates Chance go-to after acknowledge, ending on the card destination", () => {
    const initial = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    // Position 5 + roll 2 → Chance (7)
    initial.players.p1.position = 5;
    initial.chanceDeck.drawPile = [
      "ch_advance_illinois",
      ...initial.chanceDeck.drawPile.filter(
        (id) => id !== "ch_advance_illinois",
      ),
    ];
    useGameStore.getState().setFromSnapshot(structuredClone(initial));

    const roll = applyAction(
      structuredClone(initial),
      { type: "ROLL_DICE" },
      seededRng([0.0, 0.16]),
    );
    expect(roll.error).toBeUndefined();
    expect(roll.state.phase).toBe("CARD_DRAWN");
    expect(roll.state.players.p1.position).toBe(7);

    useGameStore.getState().applyServerUpdate(roll.state, roll.events);
    useGameStore.getState().completeDiceAnimation();
    useGameStore.getState().completeMoveAnimation();
    expect(useGameStore.getState().displayPositions.p1).toBe(7);
    expect(useGameStore.getState().pendingAnimation.type).toBe("none");

    // NOTE: Engine mutates in place — clone so store prev positions stay at Chance.
    const ack = ackCardNow(roll.state);
    expect(ack.error).toBeUndefined();
    // Illinois Avenue
    expect(ack.state.players.p1.position).toBe(24);

    useGameStore.getState().applyServerUpdate(ack.state, ack.events);
    let store = useGameStore.getState();
    expect(store.pendingAnimation.type).toBe("move");
    expect(store.pendingAnimation.fromPosition).toBe(7);
    expect(store.pendingAnimation.toPosition).toBe(24);
    expect(store.pendingAnimation.moveMode).toBe("slide");
    expect(store.pendingAnimation.moveDirection).toBe("forward");
    expect(store.displayPositions.p1).toBe(7);
    expect(store.diceAnimationComplete).toBe(false);
    expect(store.deferredToastEvents.length).toBeGreaterThan(0);
    expect(store.takeDeferredToastEvents()).toEqual([]);

    useGameStore.getState().completeMoveAnimation();
    store = useGameStore.getState();
    expect(store.pendingAnimation.type).toBe("none");
    expect(store.displayPositions.p1).toBe(24);
    expect(store.diceAnimationComplete).toBe(true);
    expect(store.takeDeferredToastEvents().length).toBeGreaterThan(0);
  });

  it("chains card go-to when ACK arrives mid dice-move (timeout race)", () => {
    const initial = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    initial.players.p1.position = 5;
    initial.chanceDeck.drawPile = [
      "ch_advance_illinois",
      ...initial.chanceDeck.drawPile.filter(
        (id) => id !== "ch_advance_illinois",
      ),
    ];
    useGameStore.getState().setFromSnapshot(structuredClone(initial));

    const roll = applyAction(
      structuredClone(initial),
      { type: "ROLL_DICE" },
      seededRng([0.0, 0.16]),
    );
    useGameStore.getState().applyServerUpdate(roll.state, roll.events);
    expect(useGameStore.getState().pendingAnimation.type).toBe("dice");
    expect(useGameStore.getState().pendingAnimation.toPosition).toBe(7);

    // Server auto-ACK while client still animating hop to Chance
    const ack = ackCardNow(roll.state);
    expect(ack.state.players.p1.position).toBe(24);

    useGameStore.getState().applyServerUpdate(ack.state, ack.events);
    let store = useGameStore.getState();
    expect(store.pendingAnimation.type).toBe("dice");
    expect(store.pendingAnimation.toPosition).toBe(7);
    expect(store.pendingAnimation.nextMove?.toPosition).toBe(24);
    expect(store.pendingAnimation.nextMove?.moveMode).toBe("slide");
    expect(store.pendingAnimation.nextMove?.moveDirection).toBe("forward");
    // Must not snap to Chance as final while state is already at Illinois
    expect(store.displayPositions.p1).not.toBe(24);

    useGameStore.getState().completeDiceAnimation();
    useGameStore.getState().completeMoveAnimation();
    store = useGameStore.getState();
    expect(store.pendingAnimation.type).toBe("move");
    expect(store.pendingAnimation.fromPosition).toBe(7);
    expect(store.pendingAnimation.toPosition).toBe(24);
    expect(store.pendingAnimation.moveMode).toBe("slide");
    expect(store.displayPositions.p1).toBe(7);

    useGameStore.getState().completeMoveAnimation();
    store = useGameStore.getState();
    expect(store.pendingAnimation.type).toBe("none");
    expect(store.displayPositions.p1).toBe(24);
  });

  it("slides backward on Chance go-back after acknowledge", () => {
    const initial = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    // Position 5 + roll 2 → Chance (7)
    initial.players.p1.position = 5;
    initial.chanceDeck.drawPile = [
      "ch_go_back_3",
      ...initial.chanceDeck.drawPile.filter((id) => id !== "ch_go_back_3"),
    ];
    useGameStore.getState().setFromSnapshot(structuredClone(initial));

    const roll = applyAction(
      structuredClone(initial),
      { type: "ROLL_DICE" },
      seededRng([0.0, 0.16]),
    );
    useGameStore.getState().applyServerUpdate(roll.state, roll.events);
    useGameStore.getState().completeDiceAnimation();
    useGameStore.getState().completeMoveAnimation();

    const ack = ackCardNow(roll.state);
    expect(ack.error).toBeUndefined();
    expect(ack.state.players.p1.position).toBe(4);

    useGameStore.getState().applyServerUpdate(ack.state, ack.events);
    const store = useGameStore.getState();
    expect(store.pendingAnimation.type).toBe("move");
    expect(store.pendingAnimation.fromPosition).toBe(7);
    expect(store.pendingAnimation.toPosition).toBe(4);
    expect(store.pendingAnimation.moveMode).toBe("slide");
    expect(store.pendingAnimation.moveDirection).toBe("backward");
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

  it("slides to jail on Chance go-to-jail after acknowledge", () => {
    const initial = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    initial.players.p1.position = 5;
    initial.chanceDeck.drawPile = [
      "ch_go_to_jail",
      ...initial.chanceDeck.drawPile.filter((id) => id !== "ch_go_to_jail"),
    ];
    useGameStore.getState().setFromSnapshot(structuredClone(initial));

    const roll = applyAction(
      structuredClone(initial),
      { type: "ROLL_DICE" },
      seededRng([0.0, 0.16]),
    );
    useGameStore.getState().applyServerUpdate(roll.state, roll.events);
    useGameStore.getState().completeDiceAnimation();
    useGameStore.getState().completeMoveAnimation();

    const ack = ackCardNow(roll.state);
    expect(ack.state.players.p1.position).toBe(JAIL_POSITION);
    expect(ack.events.some((e) => e.type === "SENT_TO_JAIL")).toBe(true);

    useGameStore.getState().applyServerUpdate(ack.state, ack.events);
    const store = useGameStore.getState();
    expect(store.pendingAnimation.type).toBe("move");
    expect(store.pendingAnimation.toPosition).toBe(JAIL_POSITION);
    expect(store.pendingAnimation.moveMode).toBe("slide");
    expect(store.pendingAnimation.moveDirection).toBe("forward");
  });

  it("slides forward to jail from positions before Jail so the path does not wrap past Go", () => {
    const initial = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    initial.players.p1.position = 5;
    useGameStore.getState().setFromSnapshot(structuredClone(initial));

    const after = structuredClone(initial);
    after.players.p1.position = 10;
    after.players.p1.isInJail = true;
    after.players.p1.jailState = {
      turnsInJail: 0,
      hasGetOutOfJailFreeCard: false,
    };

    useGameStore.getState().applyServerUpdate(after, [
      {
        type: "DICE_ROLLED",
        playerId: "p1",
        dice: [1, 1],
        newPosition: 10,
      },
      { type: "SENT_TO_JAIL", playerId: "p1" },
    ]);

    const store = useGameStore.getState();
    expect(store.pendingAnimation.moveMode).toBe("slide");
    expect(store.pendingAnimation.moveDirection).toBe("forward");
    expect(store.pendingAnimation.fromPosition).toBe(5);
    expect(store.pendingAnimation.toPosition).toBe(10);
  });
});
