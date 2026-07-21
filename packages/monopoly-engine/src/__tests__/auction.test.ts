import { describe, expect, it } from "vitest";
import { applyAction, createInitialState } from "../index.js";

function setupBuyOrDecline(position = 1) {
  const state = createInitialState("test", [
    { id: "p1", name: "Alice", token: "car" },
    { id: "p2", name: "Bob", token: "hat" },
    { id: "p3", name: "Carol", token: "dog" },
  ]);
  state.players.p1.position = position;
  state.phase = "BUY_OR_DECLINE";
  state.lastDice = [2, 3];
  return state;
}

describe("auction", () => {
  it("starts a bank auction from BUY_OR_DECLINE", () => {
    const state = setupBuyOrDecline(1);
    state.actionDeadlineAt = "2026-01-01T00:00:30.000Z";
    const result = applyAction(state, { type: "START_AUCTION" });

    expect(result.error).toBeUndefined();
    expect(result.state.phase).toBe("AUCTION");
    expect(result.state.auction?.kind).toBe("bank");
    expect(result.state.auction?.position).toBe(1);
    expect(result.state.auction?.bidderOrder).toEqual(["p1", "p2", "p3"]);
    expect(result.state.actionDeadlinePausedMs).toBeTypeOf("number");
    expect(result.events.some((e) => e.type === "AUCTION_STARTED")).toBe(true);
  });

  it("autofolds a player when high bid exceeds their cash", () => {
    const state = setupBuyOrDecline(1);
    state.players.p2.cash = 50;
    applyAction(state, { type: "START_AUCTION" });

    const bid = applyAction(
      state,
      { type: "PLACE_BID", amount: 100 },
      Math.random,
      "p1",
    );
    expect(bid.error).toBeUndefined();
    expect(
      bid.events.some(
        (e) => e.type === "AUCTION_AUTOFOLDED" && e.playerId === "p2",
      ),
    ).toBe(true);
    expect(state.auction?.bidderOrder.includes("p2")).toBe(false);
  });

  it("awards bank auction to highest bidder when others pass", () => {
    const state = setupBuyOrDecline(1);
    applyAction(state, { type: "START_AUCTION" });

    applyAction(state, { type: "PLACE_BID", amount: 40 }, Math.random, "p1");
    applyAction(state, { type: "PASS_AUCTION" }, Math.random, "p2");
    const result = applyAction(
      state,
      { type: "PASS_AUCTION" },
      Math.random,
      "p3",
    );

    expect(result.error).toBeUndefined();
    expect(result.events.some((e) => e.type === "AUCTION_WON")).toBe(true);
    expect(state.ownership[1]?.ownerId).toBe("p1");
    expect(state.players.p1.cash).toBe(1500 - 40);
    expect(state.phase).toBe("BUY_OR_DECLINE");
    expect(state.auction).toBeNull();
  });

  it("cancels bank auction when everyone passes with no bids", () => {
    const state = setupBuyOrDecline(1);
    applyAction(state, { type: "START_AUCTION" });

    applyAction(state, { type: "PASS_AUCTION" }, Math.random, "p1");
    applyAction(state, { type: "PASS_AUCTION" }, Math.random, "p2");
    const result = applyAction(
      state,
      { type: "PASS_AUCTION" },
      Math.random,
      "p3",
    );

    expect(result.events.some((e) => e.type === "AUCTION_CANCELLED")).toBe(
      true,
    );
    expect(state.ownership[1]).toBeUndefined();
    expect(state.phase).toBe("BUY_OR_DECLINE");
  });

  it("excludes seller from owner auction and preserves mortgage", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
      { id: "p3", name: "Carol", token: "dog" },
    ]);
    state.phase = "END_TURN";
    state.players.p1.ownedPositions = [1];
    state.players.p1.mortgaged = [1];
    state.ownership[1] = { ownerId: "p1", isMortgaged: true };

    const start = applyAction(state, {
      type: "START_OWNER_AUCTION",
      position: 1,
    });
    expect(start.error).toBeUndefined();
    expect(state.auction?.bidderOrder).toEqual(["p2", "p3"]);
    expect(state.auction?.sellerId).toBe("p1");

    applyAction(state, { type: "PLACE_BID", amount: 80 }, Math.random, "p2");
    const result = applyAction(
      state,
      { type: "PASS_AUCTION" },
      Math.random,
      "p3",
    );

    expect(result.events.some((e) => e.type === "AUCTION_WON")).toBe(true);
    expect(state.ownership[1]).toEqual({ ownerId: "p2", isMortgaged: true });
    expect(state.players.p2.mortgaged).toContain(1);
    expect(state.players.p1.ownedPositions).not.toContain(1);
    expect(state.players.p1.cash).toBe(1500 + 80);
    expect(state.players.p2.cash).toBe(1500 - 80);
  });

  it("blocks owner auction when buildings remain", () => {
    const state = createInitialState("test", [
      { id: "p1", name: "Alice", token: "car" },
      { id: "p2", name: "Bob", token: "hat" },
    ]);
    state.phase = "END_TURN";
    state.players.p1.ownedPositions = [1];
    state.players.p1.houses[1] = 1;
    state.ownership[1] = { ownerId: "p1", isMortgaged: false };

    const result = applyAction(state, {
      type: "START_OWNER_AUCTION",
      position: 1,
    });
    expect(result.error).toBe(
      "Sell all houses/hotels evenly from this color group first.",
    );
  });

  it("resumes paused turn timer after auction resolves", () => {
    const state = setupBuyOrDecline(1);
    state.actionDeadlineAt = "2026-01-01T00:00:30.000Z";
    applyAction(state, { type: "START_AUCTION" });

    applyAction(state, { type: "PLACE_BID", amount: 40 }, Math.random, "p1");
    applyAction(state, { type: "PASS_AUCTION" }, Math.random, "p2");
    const result = applyAction(
      state,
      { type: "PASS_AUCTION" },
      Math.random,
      "p3",
    );

    expect(result.error).toBeUndefined();
    expect(state.phase).toBe("BUY_OR_DECLINE");
    expect(state.actionDeadlinePausedMs).toBeNull();
    expect(state.actionDeadlineAt).not.toBeNull();
  });
});
