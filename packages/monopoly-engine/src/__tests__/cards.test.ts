import { describe, expect, it } from "vitest";
import { applyCardEffect, drawCardId, lookupCard } from "../cards.js";
import type { Card } from "../config/board.js";
import { RAILROAD_RENT } from "../config/board.js";
import { diceSum } from "../dice.js";
import { applyAction, createInitialState } from "../index.js";
import { resolveLanding } from "../resolveLanding.js";
import type { GameState } from "../types.js";
import { CARD_REVEAL_PAUSE_MS } from "../types.js";

const fixedRng = () => 0;

function getCard(deck: "chance" | "community_chest", id: string): Card {
  const card = lookupCard(deck, id);
  if (!card) throw new Error(`Card ${id} not found in deck ${deck}`);
  return card;
}

function seededRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

/** Skip the multiplayer card-reveal pause in unit tests. */
function allowImmediateCardAck(state: GameState) {
  if (state.pendingCard) {
    state.pendingCard.drawnAt = new Date(0).toISOString();
  }
}

describe("drawCardId", () => {
  it("draws the top card from the draw pile", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    state.chanceDeck.drawPile = ["ch_goojf", "ch_advance_go"];
    const drawn = drawCardId(state.chanceDeck, fixedRng);
    expect(drawn).toBe("ch_goojf");
    expect(state.chanceDeck.drawPile).toEqual(["ch_advance_go"]);
  });

  it("reshuffles discard into draw pile when draw pile is empty", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    state.chanceDeck.drawPile = [];
    state.chanceDeck.discardPile = ["ch_advance_go", "ch_poor_tax"];

    const drawn = drawCardId(state.chanceDeck, fixedRng);

    expect(drawn).not.toBeNull();
    expect(state.chanceDeck.discardPile).toHaveLength(0);
    // One was drawn, one remains in draw pile
    expect(state.chanceDeck.drawPile).toHaveLength(1);
  });

  it("returns null when both piles are empty", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    state.chanceDeck.drawPile = [];
    state.chanceDeck.discardPile = [];
    expect(drawCardId(state.chanceDeck, fixedRng)).toBeNull();
  });
});

describe("applyCardEffect — get_out_of_jail_free", () => {
  it("increments goojfCards and records 'chance' source", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    applyCardEffect(
      state,
      "p1",
      getCard("chance", "ch_goojf"),
      "chance",
      fixedRng,
    );

    expect(state.players.p1.goojfCards).toBe(1);
    expect(state.players.p1.goojfCardSources).toEqual(["chance"]);
    // Card must NOT be in the discard pile while held
    expect(state.chanceDeck.discardPile).not.toContain("ch_goojf");
  });

  it("increments goojfCards and records 'community_chest' source", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    applyCardEffect(
      state,
      "p1",
      getCard("community_chest", "cc_goojf"),
      "community_chest",
      fixedRng,
    );

    expect(state.players.p1.goojfCards).toBe(1);
    expect(state.players.p1.goojfCardSources).toEqual(["community_chest"]);
    expect(state.communityChestDeck.discardPile).not.toContain("cc_goojf");
  });

  it("can hold both a chance and a community-chest GOOJF card simultaneously", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    applyCardEffect(
      state,
      "p1",
      getCard("chance", "ch_goojf"),
      "chance",
      fixedRng,
    );
    applyCardEffect(
      state,
      "p1",
      getCard("community_chest", "cc_goojf"),
      "community_chest",
      fixedRng,
    );

    expect(state.players.p1.goojfCards).toBe(2);
    expect(state.players.p1.goojfCardSources).toEqual([
      "chance",
      "community_chest",
    ]);
  });
});

describe("applyCardEffect — cash effects", () => {
  it("adds cash for positive amount", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const before = state.players.p1.cash;

    applyCardEffect(
      state,
      "p1",
      getCard("chance", "ch_bank_dividend"),
      "chance",
      fixedRng,
    );

    expect(state.players.p1.cash).toBe(before + 50);
    expect(state.chanceDeck.discardPile).toContain("ch_bank_dividend");
  });

  it("deducts cash for negative amount", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const before = state.players.p1.cash;

    applyCardEffect(
      state,
      "p1",
      getCard("chance", "ch_poor_tax"),
      "chance",
      fixedRng,
    );

    expect(state.players.p1.cash).toBe(before - 15);
  });
});

describe("applyCardEffect — go_to_jail", () => {
  it("sends player to jail position with jail state", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    state.players.p1.position = 7;

    const events = applyCardEffect(
      state,
      "p1",
      getCard("chance", "ch_go_to_jail"),
      "chance",
      fixedRng,
    );

    expect(state.players.p1.position).toBe(10);
    expect(state.players.p1.isInJail).toBe(true);
    expect(state.players.p1.jailState).not.toBeNull();
    expect(events.some((e) => e.type === "SENT_TO_JAIL")).toBe(true);
    expect(state.chanceDeck.discardPile).toContain("ch_go_to_jail");
  });
});

describe("GOOJF via full ROLL_DICE → ACKNOWLEDGE_CARD flow", () => {
  function setupState(): GameState {
    return createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
  }

  it("awards ch_goojf without manually mutating goojfCards", () => {
    const state = setupState();

    // Force ch_goojf to the top of the chance draw pile
    state.chanceDeck.drawPile = [
      "ch_goojf",
      ...state.chanceDeck.drawPile.filter((id) => id !== "ch_goojf"),
    ];

    // Player at position 5 (Reading Railroad); roll [1,1]=2 → position 7 (Chance)
    state.players.p1.position = 5;
    // seededRng: Math.floor(0.1*6)+1=1, Math.floor(0.0*6)+1=1 → sum=2
    const rng = seededRng([0.1, 0.0]);

    const rollResult = applyAction(state, { type: "ROLL_DICE" }, rng);
    expect(rollResult.error).toBeUndefined();
    expect(state.players.p1.position).toBe(7);
    expect(state.phase).toBe("CARD_DRAWN");
    expect(state.pendingCard).toMatchObject({
      deck: "chance",
      cardId: "ch_goojf",
    });

    allowImmediateCardAck(state);
    const ackResult = applyAction(state, { type: "ACKNOWLEDGE_CARD" });
    expect(ackResult.error).toBeUndefined();
    expect(state.players.p1.goojfCards).toBe(1);
    expect(state.players.p1.goojfCardSources).toEqual(["chance"]);
    expect(state.pendingCard).toBeNull();
    // Doubles → should be able to roll again
    expect(state.phase).toBe("PRE_ROLL");
  });

  it("awards cc_goojf without manually mutating goojfCards", () => {
    const state = setupState();

    // Force cc_goojf to the top of the community chest draw pile
    state.communityChestDeck.drawPile = [
      "cc_goojf",
      ...state.communityChestDeck.drawPile.filter((id) => id !== "cc_goojf"),
    ];

    // Player at position 0 (GO); roll [1,1]=2 → position 2 (Community Chest)
    // seededRng: same pattern gives [1,1]=2
    const rng = seededRng([0.1, 0.0]);

    const rollResult = applyAction(state, { type: "ROLL_DICE" }, rng);
    expect(rollResult.error).toBeUndefined();
    expect(state.players.p1.position).toBe(2);
    expect(state.phase).toBe("CARD_DRAWN");
    expect(state.pendingCard).toMatchObject({
      deck: "community_chest",
      cardId: "cc_goojf",
    });

    allowImmediateCardAck(state);
    const ackResult = applyAction(state, { type: "ACKNOWLEDGE_CARD" });
    expect(ackResult.error).toBeUndefined();
    expect(state.players.p1.goojfCards).toBe(1);
    expect(state.players.p1.goojfCardSources).toEqual(["community_chest"]);
    expect(state.pendingCard).toBeNull();
  });

  it("rejects acknowledge during the card reveal pause", () => {
    const state = setupState();
    state.chanceDeck.drawPile = [
      "ch_goojf",
      ...state.chanceDeck.drawPile.filter((id) => id !== "ch_goojf"),
    ];
    state.players.p1.position = 5;
    applyAction(state, { type: "ROLL_DICE" }, seededRng([0.1, 0.0]));
    expect(state.phase).toBe("CARD_DRAWN");
    expect(state.pendingCard?.drawnAt).toBeTruthy();

    const blocked = applyAction(state, { type: "ACKNOWLEDGE_CARD" });
    expect(blocked.error).toBe("Card reveal in progress");

    allowImmediateCardAck(state);
    const allowed = applyAction(state, { type: "ACKNOWLEDGE_CARD" });
    expect(allowed.error).toBeUndefined();
    expect(CARD_REVEAL_PAUSE_MS).toBeGreaterThan(0);
  });

  it("returns ch_goojf to chance discard when spent from jail", () => {
    const state = setupState();

    // Award ch_goojf directly via applyCardEffect (the award path itself)
    applyCardEffect(
      state,
      "p1",
      getCard("chance", "ch_goojf"),
      "chance",
      fixedRng,
    );

    // Put player in jail
    state.players.p1.isInJail = true;
    state.players.p1.jailState = {
      turnsInJail: 0,
      hasGetOutOfJailFreeCard: false,
    };
    state.players.p1.position = 10;
    // Simulate reaching JAIL_DECISION phase
    state.phase = "JAIL_DECISION";

    const spendResult = applyAction(state, { type: "USE_GOOJF_CARD" });
    expect(spendResult.error).toBeUndefined();
    expect(state.players.p1.goojfCards).toBe(0);
    expect(state.players.p1.goojfCardSources).toHaveLength(0);
    expect(state.chanceDeck.discardPile).toContain("ch_goojf");
    expect(state.phase).toBe("PRE_ROLL");
  });

  it("returns cc_goojf to community chest discard when spent from jail", () => {
    const state = setupState();

    applyCardEffect(
      state,
      "p1",
      getCard("community_chest", "cc_goojf"),
      "community_chest",
      fixedRng,
    );

    state.players.p1.isInJail = true;
    state.players.p1.jailState = {
      turnsInJail: 0,
      hasGetOutOfJailFreeCard: false,
    };
    state.players.p1.position = 10;
    state.phase = "JAIL_DECISION";

    const spendResult = applyAction(state, { type: "USE_GOOJF_CARD" });
    expect(spendResult.error).toBeUndefined();
    expect(state.players.p1.goojfCards).toBe(0);
    expect(state.communityChestDeck.discardPile).toContain("cc_goojf");
  });

  it("non-movement card after non-doubles roll sets END_TURN phase", () => {
    const state = setupState();

    state.chanceDeck.drawPile = [
      "ch_bank_dividend",
      ...state.chanceDeck.drawPile.filter((id) => id !== "ch_bank_dividend"),
    ];

    // Player at position 6; roll [1,2]=3 → position 7 (Chance), non-doubles
    state.players.p1.position = 4;
    // [0.0,0.2] → [1,2] sum=3
    const rng = seededRng([0.0, 0.2]);

    applyAction(state, { type: "ROLL_DICE" }, rng);
    expect(state.phase).toBe("CARD_DRAWN");

    allowImmediateCardAck(state);
    applyAction(state, { type: "ACKNOWLEDGE_CARD" });
    expect(state.phase).toBe("END_TURN");
  });

  it("rejects ACKNOWLEDGE_CARD when not in CARD_DRAWN phase", () => {
    const state = setupState();
    const result = applyAction(state, { type: "ACKNOWLEDGE_CARD" });
    expect(result.error).toBeDefined();
  });
});

describe("applyCardEffect — move_to (advance to Go)", () => {
  it("moves player to target position and collects Go salary if applicable", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    state.players.p1.position = 24;
    const cashBefore = state.players.p1.cash;

    applyCardEffect(
      state,
      "p1",
      getCard("chance", "ch_advance_go"),
      "chance",
      fixedRng,
    );

    expect(state.players.p1.position).toBe(0);
    // Landed on GO itself, not "passed", so no $200 salary (setPlayerPosition excludes GO_POSITION)
    expect(state.players.p1.cash).toBe(cashBefore);
  });
});

describe("applyCardEffect — go_back_spaces", () => {
  it("moves player backward without passing Go", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    state.players.p1.position = 7;
    const cashBefore = state.players.p1.cash;

    applyCardEffect(
      state,
      "p1",
      getCard("chance", "ch_go_back_3"),
      "chance",
      fixedRng,
    );

    expect(state.players.p1.position).toBe(4);
    expect(state.players.p1.cash).toBe(cashBefore);
  });
});

describe("ACKNOWLEDGE_CARD — movement landing rent", () => {
  it("nearest railroad owned charges 2× RAILROAD_RENT", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    // From GO, nearest railroad is Reading (5); one railroad → base $25 × 2 = $50
    state.players.p1.position = 0;
    state.ownership[5] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(5);
    state.phase = "CARD_DRAWN";
    state.pendingCard = {
      deck: "chance",
      cardId: "ch_advance_nearest_railroad_1",
    };
    state.lastDice = [2, 3];
    state.allowDoublesReroll = false;

    const p1Before = state.players.p1.cash;
    const result = applyAction(state, { type: "ACKNOWLEDGE_CARD" });

    expect(result.error).toBeUndefined();
    expect(state.players.p1.position).toBe(5);
    expect(state.players.p1.cash).toBe(p1Before - 2 * RAILROAD_RENT[1]);
    expect(
      result.events.some(
        (e) => e.type === "RENT_PAID" && e.amount === 2 * RAILROAD_RENT[1],
      ),
    ).toBe(true);
  });

  it("nearest utility owned charges 10× freshly rolled dice", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    // From GO, nearest utility is Electric Company (12)
    state.players.p1.position = 0;
    state.ownership[12] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(12);
    state.phase = "CARD_DRAWN";
    state.pendingCard = {
      deck: "chance",
      cardId: "ch_advance_nearest_utility",
    };
    // lastDice would wrongly yield 4×12=48 with ownership multiplier; must not be used
    state.lastDice = [6, 6];
    state.allowDoublesReroll = false;

    // [0.0, 0.2] → dice [1, 2] sum 3 → rent 10×3 = 30
    const rng = seededRng([0.0, 0.2]);
    const p1Before = state.players.p1.cash;
    const result = applyAction(state, { type: "ACKNOWLEDGE_CARD" }, rng);

    expect(result.error).toBeUndefined();
    expect(state.players.p1.position).toBe(12);
    expect(state.players.p1.cash).toBe(p1Before - 30);
    // NOTE: Fresh rent roll must not overwrite lastDice (doubles tracking).
    expect(state.lastDice).toEqual([6, 6]);
  });

  it("move_to onto owned utility uses lastDice sum for rent", () => {
    const state = createInitialState("g1", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.ownership[12] = { ownerId: "p2", isMortgaged: false };
    state.players.p2.ownedPositions.push(12);
    state.players.p1.position = 0;
    state.lastDice = [3, 4]; // sum 7 → 7×4 = 28
    state.allowDoublesReroll = false;

    // No deck card advances to a utility; mirror ACKNOWLEDGE_CARD move_to + resolveLanding.
    const card: Card = {
      id: "test_advance_electric",
      text: "Advance to Electric Company",
      effect: { kind: "move_to", position: 12 },
    };
    applyCardEffect(state, "p1", card, "chance", fixedRng);
    expect(state.players.p1.position).toBe(12);

    const p1Before = state.players.p1.cash;
    const spaces = state.lastDice ? diceSum(state.lastDice) : 0;
    const events = resolveLanding(state, "p1", spaces, {
      allowDoublesReroll: state.allowDoublesReroll,
    });

    expect(spaces).toBe(7);
    expect(state.players.p1.cash).toBe(p1Before - 28);
    expect(events.some((e) => e.type === "RENT_PAID" && e.amount === 28)).toBe(
      true,
    );
  });
});
