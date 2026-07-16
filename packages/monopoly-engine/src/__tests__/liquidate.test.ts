import { describe, expect, it } from "vitest";
import { checkBankruptcy } from "../bankruptcy.js";
import { createInitialState } from "../index.js";
import { autoLiquidateAssets } from "../liquidate.js";

describe("autoLiquidateAssets", () => {
  it("sells houses before mortgaging", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    const player = state.players.p1;
    player.cash = -40;
    player.ownedPositions = [1, 3];
    player.houses[1] = 1;
    player.houses[3] = 1;
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };
    state.bankHouses = 30;

    const events = autoLiquidateAssets(state, "p1");

    expect(events.some((e) => e.type === "HOUSE_SOLD")).toBe(true);
    expect(player.cash).toBeGreaterThanOrEqual(0);
    expect(player.isBankrupt).toBe(false);
  });

  it("mortgages then sells to bank when buildings are not enough", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    player.cash = -100;
    player.ownedPositions = [1, 3];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };

    const events = autoLiquidateAssets(state, "p1", null);

    expect(events.some((e) => e.type === "PROPERTY_MORTGAGED")).toBe(true);
    expect(events.some((e) => e.type === "PROPERTY_SOLD_TO_BANK")).toBe(true);
    expect(player.ownedPositions).toHaveLength(0);
  });

  it("does not sell deeds to bank when debt is owed to a player", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    const player = state.players.p1;
    player.cash = -100;
    player.ownedPositions = [1, 3];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };

    const events = autoLiquidateAssets(state, "p1", "p2");

    expect(events.some((e) => e.type === "PROPERTY_MORTGAGED")).toBe(true);
    expect(events.some((e) => e.type === "PROPERTY_SOLD_TO_BANK")).toBe(false);
    expect(player.ownedPositions).toHaveLength(2);
  });

  it("survives debt when property equity covers it", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    player.cash = -50;
    player.ownedPositions = [1, 3];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };

    const events = checkBankruptcy(state, "p1", null);

    expect(events.some((e) => e.type === "PLAYER_BANKRUPT")).toBe(false);
    expect(player.isBankrupt).toBe(false);
    expect(player.cash).toBeGreaterThanOrEqual(0);
    expect(events.some((e) => e.type === "PROPERTY_MORTGAGED")).toBe(true);
  });

  it("bankrupts when liquidation cannot cover the debt", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    const player = state.players.p1;
    player.cash = -500;
    player.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };

    const events = checkBankruptcy(state, "p1", "p2");

    expect(events.some((e) => e.type === "PLAYER_BANKRUPT")).toBe(true);
    expect(player.isBankrupt).toBe(true);
    expect(player.ownedPositions).toEqual([]);
  });
});
