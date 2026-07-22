import { describe, expect, it } from "vitest";
import { cashDeltaFromEvents, formatCashDeltaToast } from "./cashDeltaToast";

describe("cashDeltaToast", () => {
  it("formats signed cash toasts", () => {
    expect(formatCashDeltaToast(200)).toBe("💵 +$200");
    expect(formatCashDeltaToast(-150)).toBe("💵 -$150");
  });

  it("sums rent paid and received for the local player", () => {
    expect(
      cashDeltaFromEvents(
        [
          {
            type: "RENT_PAID",
            payerId: "p1",
            ownerId: "p2",
            position: 1,
            amount: 40,
          },
        ],
        "p1",
      ),
    ).toBe(-40);
    expect(
      cashDeltaFromEvents(
        [
          {
            type: "RENT_PAID",
            payerId: "p2",
            ownerId: "p1",
            position: 1,
            amount: 40,
          },
        ],
        "p1",
      ),
    ).toBe(40);
  });

  it("returns null when player is unaffected", () => {
    expect(
      cashDeltaFromEvents(
        [{ type: "PASSED_GO", playerId: "p2", amount: 200 }],
        "p1",
      ),
    ).toBeNull();
  });
});
