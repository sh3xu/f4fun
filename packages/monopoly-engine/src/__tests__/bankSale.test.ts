import { describe, expect, it } from "vitest";
import { bankSaleAmount, sellPropertyToBank } from "../bankSale.js";
import { createInitialState } from "../index.js";

describe("bankSale", () => {
  it("returns 90% of tile price for unmortgaged deeds", () => {
    expect(bankSaleAmount(1, false)).toBe(54);
  });

  it("returns 90% of mortgage value for mortgaged deeds", () => {
    expect(bankSaleAmount(1, true)).toBe(27);
  });

  it("blocks sell-to-bank when buildings remain", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
    ]);
    state.players.p1.ownedPositions = [1];
    state.players.p1.houses[1] = 1;
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };

    const result = sellPropertyToBank(state, "p1", 1);
    expect(result.error).toBe("Sell buildings before selling to bank");
    expect(result.events).toEqual([]);
  });
});
