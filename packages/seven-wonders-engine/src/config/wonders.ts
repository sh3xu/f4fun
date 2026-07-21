import type { WonderDef } from "../types.js";

// NOTE: All wonder data authored from publicly known Seven Wonders base-game rules (Side A only).

export const ALL_WONDERS: readonly WonderDef[] = [
  {
    id: "giza",
    name: "The Pyramids of Giza",
    side: "A",
    startingResource: "stone",
    stages: [
      { cost: { stone: 2 }, effect: { type: "points", amount: 3 } },
      { cost: { wood: 3 }, effect: { type: "points", amount: 5 } },
      { cost: { stone: 4 }, effect: { type: "points", amount: 7 } },
    ],
  },
  {
    id: "babylon",
    name: "The Hanging Gardens of Babylon",
    side: "A",
    startingResource: "clay",
    stages: [
      { cost: { clay: 2 }, effect: { type: "points", amount: 3 } },
      {
        cost: { wood: 3 },
        effect: { type: "science", symbol: "wild" },
      },
    ],
  },
  {
    id: "olympia",
    name: "The Statue of Zeus in Olympia",
    side: "A",
    startingResource: "wood",
    stages: [
      { cost: { wood: 2 }, effect: { type: "points", amount: 3 } },
      { cost: { stone: 2 }, effect: { type: "freeBuild" } },
      { cost: { ore: 2 }, effect: { type: "points", amount: 7 } },
    ],
  },
  {
    id: "rhodes",
    name: "The Colossus of Rhodes",
    side: "A",
    startingResource: "ore",
    stages: [
      { cost: { wood: 2 }, effect: { type: "points", amount: 3 } },
      { cost: { clay: 3 }, effect: { type: "shields", amount: 2 } },
      { cost: { ore: 4 }, effect: { type: "points", amount: 7 } },
    ],
  },
  {
    id: "alexandria",
    name: "The Lighthouse of Alexandria",
    side: "A",
    startingResource: "glass",
    stages: [
      { cost: { stone: 2 }, effect: { type: "points", amount: 3 } },
      {
        cost: { ore: 2 },
        effect: {
          type: "produce",
          options: [["wood"], ["stone"], ["ore"], ["clay"]],
        },
      },
      { cost: { glass: 2 }, effect: { type: "points", amount: 7 } },
    ],
  },
  {
    id: "ephesus",
    name: "The Temple of Artemis in Ephesus",
    side: "A",
    startingResource: "papyrus",
    stages: [
      { cost: { stone: 2 }, effect: { type: "points", amount: 3 } },
      { cost: { wood: 2 }, effect: { type: "coins", amount: 9 } },
      { cost: { papyrus: 2 }, effect: { type: "points", amount: 7 } },
    ],
  },
  {
    id: "halicarnassus",
    name: "The Mausoleum of Halicarnassus",
    side: "A",
    startingResource: "textile",
    stages: [
      { cost: { clay: 2 }, effect: { type: "points", amount: 3 } },
      { cost: { ore: 3 }, effect: { type: "playDiscarded" } },
      { cost: { textile: 2 }, effect: { type: "points", amount: 7 } },
    ],
  },
] as const;

const wonderMap = new Map<string, WonderDef>();
for (const w of ALL_WONDERS) {
  wonderMap.set(w.id, w);
}

export function getWonderById(id: string): WonderDef {
  const wonder = wonderMap.get(id);
  if (!wonder) throw new Error(`Unknown wonder id: ${id}`);
  return wonder;
}
