import { describe, expect, it } from "vitest";
import { checkBankruptcy } from "../bankruptcy.js";
import { createInitialState } from "../index.js";

describe("bankruptcy", () => {
  it("does nothing when player has positive cash", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    player.cash = 100;

    const events = checkBankruptcy(state, "p1", null);
    expect(events).toHaveLength(0);
    expect(player.isBankrupt).toBe(false);
  });

  it("bankrupts player with negative cash and no recoverable assets", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    player.cash = -50;
    player.ownedPositions = [];

    const events = checkBankruptcy(state, "p1", null);

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("PLAYER_BANKRUPT");
    expect(player.isBankrupt).toBe(true);
    expect(player.ownedPositions).toEqual([]);
  });

  it("transfers mortgaged properties including mortgaged list to creditor", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    // Debt exceeds what mortgaging can raise; remaining deeds transfer still mortgaged.
    state.players.p1.cash = -500;
    state.players.p1.ownedPositions = [1, 3];
    state.players.p1.mortgaged = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: true };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };

    const events = checkBankruptcy(state, "p1", "p2");

    expect(events.some((e) => e.type === "PLAYER_BANKRUPT")).toBe(true);
    expect(state.ownership[1]?.ownerId).toBe("p2");
    expect(state.ownership[3]?.ownerId).toBe("p2");
    expect(state.ownership[1]?.isMortgaged).toBe(true);
    expect(state.ownership[3]?.isMortgaged).toBe(true);
    expect(state.players.p2.ownedPositions).toEqual(
      expect.arrayContaining([1, 3]),
    );
    expect(state.players.p2.mortgaged).toEqual(expect.arrayContaining([1, 3]));
    expect(state.players.p1.mortgaged).toEqual([]);
  });

  it("returns properties to bank when no creditor", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);

    // Debt too large for mortgages + bank half-sales to fully cover.
    state.players.p1.cash = -500;
    state.players.p1.ownedPositions = [1, 3];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };

    const events = checkBankruptcy(state, "p1", null);

    expect(events.some((e) => e.type === "PLAYER_BANKRUPT")).toBe(true);
    expect(state.ownership[1]).toBeUndefined();
    expect(state.ownership[3]).toBeUndefined();
  });
});
