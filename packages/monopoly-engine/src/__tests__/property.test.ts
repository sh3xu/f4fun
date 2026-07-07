import { describe, expect, it } from "vitest";
import { createInitialState } from "../index.js";
import { buyProperty, canBuyProperty } from "../property.js";

describe("property", () => {
  it("allows buying an unowned property with sufficient cash", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    player.position = 1;

    const { canBuy } = canBuyProperty(state, "p1", 1);
    expect(canBuy).toBe(true);
  });

  it("prevents buying property with insufficient cash", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    player.position = 39;
    player.cash = 50;

    const { canBuy, reason } = canBuyProperty(state, "p1", 39);
    expect(canBuy).toBe(false);
    expect(reason).toBe("Insufficient funds");
  });

  it("prevents buying already owned property", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.ownership[1] = { ownerId: "p2", isMortgaged: false };

    const { canBuy, reason } = canBuyProperty(state, "p1", 1);
    expect(canBuy).toBe(false);
    expect(reason).toBe("Already owned");
  });

  it("deducts cash and records ownership on purchase", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    const initialCash = player.cash;

    const events = buyProperty(state, "p1", 1);

    expect(player.cash).toBe(initialCash - 60);
    expect(player.ownedPositions).toContain(1);
    expect(state.ownership[1]).toEqual({ ownerId: "p1", isMortgaged: false });
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("PROPERTY_BOUGHT");
  });
});
