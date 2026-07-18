import type { ColorGroup } from "@f4fun/monopoly-engine";

/** NOTE: Orange/light-blue/red groups land more often due to jail adjacency and dice sums. */
export const LANDING_FREQUENCY_WEIGHT: Record<ColorGroup, number> = {
  brown: 0.9,
  light_blue: 1.35,
  pink: 1.05,
  orange: 1.4,
  red: 1.25,
  yellow: 1.0,
  green: 0.95,
  dark_blue: 0.85,
};

export function monopolyCompletionPremium(
  ownedInGroup: number,
  groupSize: number,
): number {
  if (ownedInGroup >= groupSize) return 1.5;
  if (ownedInGroup === groupSize - 1) return 1.35;
  if (ownedInGroup === 1) return 1.1;
  return 1.0;
}
