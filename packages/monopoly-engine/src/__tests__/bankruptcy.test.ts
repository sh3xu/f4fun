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

  it("bankrupts player with negative cash", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    const player = state.players.p1;
    player.cash = -50;
    player.ownedPositions = [1, 3];

    const events = checkBankruptcy(state, "p1", null);

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("PLAYER_BANKRUPT");
    expect(player.isBankrupt).toBe(true);
    expect(player.ownedPositions).toEqual([]);
  });

  it("transfers properties to creditor on bankruptcy", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);

    state.players.p1.cash = -100;
    state.players.p1.ownedPositions = [1, 3];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };

    const events = checkBankruptcy(state, "p1", "p2");

    expect(events).toHaveLength(1);
    expect(state.ownership[1]?.ownerId).toBe("p2");
    expect(state.ownership[3]?.ownerId).toBe("p2");
    expect(state.players.p2.ownedPositions).toContain(1);
    expect(state.players.p2.ownedPositions).toContain(3);
  });

  it("returns properties to bank when no creditor", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);

    state.players.p1.cash = -100;
    state.players.p1.ownedPositions = [1, 3];
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };
    state.ownership[3] = { ownerId: "p1", isMortgaged: false };

    const events = checkBankruptcy(state, "p1", null);

    expect(events).toHaveLength(1);
    expect(state.ownership[1]).toBeUndefined();
    expect(state.ownership[3]).toBeUndefined();
  });
});
