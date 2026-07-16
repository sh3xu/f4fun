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

    const events = autoLiquidateAssets(state, "p1");

    expect(events.some((e) => e.type === "PROPERTY_MORTGAGED")).toBe(true);
    expect(events.some((e) => e.type === "PROPERTY_SOLD_TO_BANK")).toBe(true);
    expect(player.ownedPositions).toHaveLength(0);
  });

  it("does not sell deed to bank while it has buildings", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    player.cash = -10;
    player.ownedPositions = [1];
    player.houses[1] = 1;
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };

    const events = autoLiquidateAssets(state, "p1", null);

    expect(events.some((e) => e.type === "PROPERTY_SOLD_TO_BANK")).toBe(false);
  });

  it("may resolve debt with mortgage before needing bank sale", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    player.cash = -10;
    player.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };

    const events = autoLiquidateAssets(state, "p1");

    expect(events.some((e) => e.type === "PROPERTY_MORTGAGED")).toBe(true);
    expect(events.some((e) => e.type === "PROPERTY_SOLD_TO_BANK")).toBe(false);
    expect(player.cash).toBeGreaterThanOrEqual(0);
  });

  it("sells mortgaged deed to bank for 90% of mortgage value", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    player.cash = -1000;
    player.ownedPositions = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };

    const events = autoLiquidateAssets(state, "p1");
    const sold = events.find((e) => e.type === "PROPERTY_SOLD_TO_BANK");

    expect(sold?.type).toBe("PROPERTY_SOLD_TO_BANK");
    // Mediterranean Avenue mortgage value: $30 → bank pays 90% = $27.
    expect(sold && "amount" in sold ? sold.amount : null).toBe(27);
    expect(state.ownership[1]).toBeUndefined();
  });

  it("allows bank sales even when debt is owed to another player", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    const player = state.players.p1;
    player.cash = -100;
    player.ownedPositions = [1, 3];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };

    const events = autoLiquidateAssets(state, "p1");

    expect(events.some((e) => e.type === "PROPERTY_MORTGAGED")).toBe(true);
    expect(events.some((e) => e.type === "PROPERTY_SOLD_TO_BANK")).toBe(true);
    expect(player.ownedPositions.length).toBeLessThan(2);
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

  it("mortgages the next eligible property when the highest-value one is blocked", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    player.cash = -100;
    player.ownedPositions = [39, 5];
    player.houses[39] = 1;
    state.ownership[39] = { ownerId: "p2", isMortgaged: false };
    state.ownership[5] = { ownerId: "p1", isMortgaged: false };

    const events = autoLiquidateAssets(state, "p1");

    expect(events.some((e) => e.type === "PROPERTY_MORTGAGED")).toBe(true);
    expect(state.ownership[5]?.ownerId).toBe("p1");
    expect(state.ownership[5]?.isMortgaged).toBe(true);
    expect(player.cash).toBeGreaterThanOrEqual(0);
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
