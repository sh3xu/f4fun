import { describe, expect, it } from "vitest";
import { getCardDisplayText, localizeCardText } from "./tile-labels";

describe("localizeCardText", () => {
  it("rewrites named move-to destinations to UI labels", () => {
    expect(
      localizeCardText(
        "Advance to Illinois Avenue. If you pass Go, collect $200",
      ),
    ).toBe("Advance to Pisa. If you pass Go, collect $200");

    expect(
      localizeCardText(
        "Advance to St. Charles Place. If you pass Go, collect $200",
      ),
    ).toBe("Advance to Seoul. If you pass Go, collect $200");

    expect(
      localizeCardText(
        "Take a trip to Reading Railroad. If you pass Go, collect $200",
      ),
    ).toBe("Take a trip to Reno Rail. If you pass Go, collect $200");

    expect(
      localizeCardText(
        "Take a walk on the Boardwalk. Advance token to Boardwalk",
      ),
    ).toBe("Take a walk on the Ajman. Advance token to Ajman");
  });

  it("leaves cards without place names unchanged", () => {
    expect(localizeCardText("Pay poor tax of $15")).toBe("Pay poor tax of $15");
  });
});

describe("getCardDisplayText", () => {
  it("returns localized Chance move-to copy", () => {
    expect(getCardDisplayText("chance", "ch_advance_illinois")).toBe(
      "Advance to Pisa. If you pass Go, collect $200",
    );
    expect(getCardDisplayText("chance", "ch_boardwalk")).toBe(
      "Take a walk on the Ajman. Advance token to Ajman",
    );
  });

  it("returns null for unknown cards", () => {
    expect(getCardDisplayText("chance", "missing")).toBeNull();
  });
});
