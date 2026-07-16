import { describe, expect, it } from "vitest";
import {
  areAnimationsSettled,
  shouldDeferGameEventToasts,
} from "./deferred-toasts";

describe("deferred-toasts", () => {
  it("defers batches that include DICE_ROLLED", () => {
    expect(
      shouldDeferGameEventToasts([
        {
          type: "DICE_ROLLED",
          playerId: "p1",
          dice: [2, 3],
          newPosition: 5,
        },
        { type: "PASSED_GO", playerId: "p1", amount: 200 },
      ]),
    ).toBe(true);
  });

  it("does not defer buy / trade / auction batches", () => {
    expect(
      shouldDeferGameEventToasts([
        {
          type: "PROPERTY_BOUGHT",
          playerId: "p1",
          position: 1,
          price: 60,
        },
      ]),
    ).toBe(false);
    expect(
      shouldDeferGameEventToasts([
        {
          type: "TRADE_PROPOSED",
          tradeId: "t1",
          fromPlayerId: "p1",
          toPlayerId: "p2",
        },
      ]),
    ).toBe(false);
  });

  it("treats animations as settled only after dice and move clear", () => {
    expect(areAnimationsSettled(false, "dice")).toBe(false);
    expect(areAnimationsSettled(false, "move")).toBe(false);
    expect(areAnimationsSettled(true, "move")).toBe(false);
    expect(areAnimationsSettled(true, "none")).toBe(true);
  });
});
