export type TileType =
  | "property"
  | "railroad"
  | "utility"
  | "tax"
  | "go"
  | "jail"
  | "free_parking"
  | "go_to_jail"
  | "chance"
  | "community_chest";

export type ColorGroup =
  | "brown"
  | "light_blue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "dark_blue";

export interface PropertyTile {
  readonly type: "property";
  readonly position: number;
  readonly name: string;
  readonly price: number;
  readonly colorGroup: ColorGroup;
  readonly rent: number;
  readonly rentLevels: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  readonly houseCost: number;
  readonly mortgageValue: number;
}

export interface RailroadTile {
  readonly type: "railroad";
  readonly position: number;
  readonly name: string;
  readonly price: number;
  readonly mortgageValue: number;
}

export interface UtilityTile {
  readonly type: "utility";
  readonly position: number;
  readonly name: string;
  readonly price: number;
  readonly mortgageValue: number;
}

export interface TaxTile {
  readonly type: "tax";
  readonly position: number;
  readonly name: string;
  readonly amount: number;
}

export interface SimpleTile {
  readonly type:
    | "go"
    | "jail"
    | "free_parking"
    | "go_to_jail"
    | "chance"
    | "community_chest";
  readonly position: number;
  readonly name: string;
}

export type BoardTile =
  | PropertyTile
  | RailroadTile
  | UtilityTile
  | TaxTile
  | SimpleTile;

export const BOARD_TILES: readonly BoardTile[] = [
  { type: "go", position: 0, name: "GO" },
  {
    type: "property",
    position: 1,
    name: "Mediterranean Avenue",
    price: 60,
    colorGroup: "brown",
    rent: 2,
    rentLevels: [2, 10, 30, 90, 160, 250],
    houseCost: 50,
    mortgageValue: 30,
  },
  { type: "community_chest", position: 2, name: "Community Chest" },
  {
    type: "property",
    position: 3,
    name: "Baltic Avenue",
    price: 60,
    colorGroup: "brown",
    rent: 4,
    rentLevels: [4, 20, 60, 180, 320, 450],
    houseCost: 50,
    mortgageValue: 30,
  },
  { type: "tax", position: 4, name: "Income Tax", amount: 200 },
  {
    type: "railroad",
    position: 5,
    name: "Reading Railroad",
    price: 200,
    mortgageValue: 100,
  },
  {
    type: "property",
    position: 6,
    name: "Oriental Avenue",
    price: 100,
    colorGroup: "light_blue",
    rent: 6,
    rentLevels: [6, 30, 90, 270, 400, 550],
    houseCost: 50,
    mortgageValue: 50,
  },
  { type: "chance", position: 7, name: "Chance" },
  {
    type: "property",
    position: 8,
    name: "Vermont Avenue",
    price: 100,
    colorGroup: "light_blue",
    rent: 6,
    rentLevels: [6, 30, 90, 270, 400, 550],
    houseCost: 50,
    mortgageValue: 50,
  },
  {
    type: "property",
    position: 9,
    name: "Connecticut Avenue",
    price: 120,
    colorGroup: "light_blue",
    rent: 8,
    rentLevels: [8, 40, 100, 300, 450, 600],
    houseCost: 50,
    mortgageValue: 60,
  },
  { type: "jail", position: 10, name: "Jail / Just Visiting" },
  {
    type: "property",
    position: 11,
    name: "St. Charles Place",
    price: 140,
    colorGroup: "pink",
    rent: 10,
    rentLevels: [10, 50, 150, 450, 625, 750],
    houseCost: 100,
    mortgageValue: 70,
  },
  {
    type: "utility",
    position: 12,
    name: "Electric Company",
    price: 150,
    mortgageValue: 75,
  },
  {
    type: "property",
    position: 13,
    name: "States Avenue",
    price: 140,
    colorGroup: "pink",
    rent: 10,
    rentLevels: [10, 50, 150, 450, 625, 750],
    houseCost: 100,
    mortgageValue: 70,
  },
  {
    type: "property",
    position: 14,
    name: "Virginia Avenue",
    price: 160,
    colorGroup: "pink",
    rent: 12,
    rentLevels: [12, 60, 180, 500, 700, 900],
    houseCost: 100,
    mortgageValue: 80,
  },
  {
    type: "railroad",
    position: 15,
    name: "Pennsylvania Railroad",
    price: 200,
    mortgageValue: 100,
  },
  {
    type: "property",
    position: 16,
    name: "St. James Place",
    price: 180,
    colorGroup: "orange",
    rent: 14,
    rentLevels: [14, 70, 200, 550, 750, 950],
    houseCost: 100,
    mortgageValue: 90,
  },
  { type: "community_chest", position: 17, name: "Community Chest" },
  {
    type: "property",
    position: 18,
    name: "Tennessee Avenue",
    price: 180,
    colorGroup: "orange",
    rent: 14,
    rentLevels: [14, 70, 200, 550, 750, 950],
    houseCost: 100,
    mortgageValue: 90,
  },
  {
    type: "property",
    position: 19,
    name: "New York Avenue",
    price: 200,
    colorGroup: "orange",
    rent: 16,
    rentLevels: [16, 80, 220, 600, 800, 1000],
    houseCost: 100,
    mortgageValue: 100,
  },
  { type: "free_parking", position: 20, name: "Free Parking" },
  {
    type: "property",
    position: 21,
    name: "Kentucky Avenue",
    price: 220,
    colorGroup: "red",
    rent: 18,
    rentLevels: [18, 90, 250, 700, 875, 1050],
    houseCost: 150,
    mortgageValue: 110,
  },
  { type: "chance", position: 22, name: "Chance" },
  {
    type: "property",
    position: 23,
    name: "Indiana Avenue",
    price: 220,
    colorGroup: "red",
    rent: 18,
    rentLevels: [18, 90, 250, 700, 875, 1050],
    houseCost: 150,
    mortgageValue: 110,
  },
  {
    type: "property",
    position: 24,
    name: "Illinois Avenue",
    price: 240,
    colorGroup: "red",
    rent: 20,
    rentLevels: [20, 100, 300, 750, 925, 1100],
    houseCost: 150,
    mortgageValue: 120,
  },
  {
    type: "railroad",
    position: 25,
    name: "B&O Railroad",
    price: 200,
    mortgageValue: 100,
  },
  {
    type: "property",
    position: 26,
    name: "Atlantic Avenue",
    price: 260,
    colorGroup: "yellow",
    rent: 22,
    rentLevels: [22, 110, 330, 800, 975, 1150],
    houseCost: 150,
    mortgageValue: 130,
  },
  {
    type: "property",
    position: 27,
    name: "Ventnor Avenue",
    price: 260,
    colorGroup: "yellow",
    rent: 22,
    rentLevels: [22, 110, 330, 800, 975, 1150],
    houseCost: 150,
    mortgageValue: 130,
  },
  {
    type: "utility",
    position: 28,
    name: "Water Works",
    price: 150,
    mortgageValue: 75,
  },
  {
    type: "property",
    position: 29,
    name: "Marvin Gardens",
    price: 280,
    colorGroup: "yellow",
    rent: 24,
    rentLevels: [24, 120, 360, 850, 1025, 1200],
    houseCost: 150,
    mortgageValue: 140,
  },
  { type: "go_to_jail", position: 30, name: "Go To Jail" },
  {
    type: "property",
    position: 31,
    name: "Pacific Avenue",
    price: 300,
    colorGroup: "green",
    rent: 26,
    rentLevels: [26, 130, 390, 900, 1100, 1275],
    houseCost: 200,
    mortgageValue: 150,
  },
  {
    type: "property",
    position: 32,
    name: "North Carolina Avenue",
    price: 300,
    colorGroup: "green",
    rent: 26,
    rentLevels: [26, 130, 390, 900, 1100, 1275],
    houseCost: 200,
    mortgageValue: 150,
  },
  { type: "community_chest", position: 33, name: "Community Chest" },
  {
    type: "property",
    position: 34,
    name: "Pennsylvania Avenue",
    price: 320,
    colorGroup: "green",
    rent: 28,
    rentLevels: [28, 150, 450, 1000, 1200, 1400],
    houseCost: 200,
    mortgageValue: 160,
  },
  {
    type: "railroad",
    position: 35,
    name: "Short Line Railroad",
    price: 200,
    mortgageValue: 100,
  },
  { type: "chance", position: 36, name: "Chance" },
  {
    type: "property",
    position: 37,
    name: "Park Place",
    price: 350,
    colorGroup: "dark_blue",
    rent: 35,
    rentLevels: [35, 175, 500, 1100, 1300, 1500],
    houseCost: 200,
    mortgageValue: 175,
  },
  { type: "tax", position: 38, name: "Luxury Tax", amount: 75 },
  {
    type: "property",
    position: 39,
    name: "Boardwalk",
    price: 400,
    colorGroup: "dark_blue",
    rent: 50,
    rentLevels: [50, 200, 600, 1400, 1700, 2000],
    houseCost: 200,
    mortgageValue: 200,
  },
] as const;

export const TILE_BY_POSITION = new Map<number, BoardTile>(
  BOARD_TILES.map((t) => [t.position, t]),
);

export const POSITIONS_BY_COLOR = new Map<ColorGroup, readonly number[]>(
  (
    [
      "brown",
      "light_blue",
      "pink",
      "orange",
      "red",
      "yellow",
      "green",
      "dark_blue",
    ] as const
  ).map((color) => [
    color,
    BOARD_TILES.filter(
      (t): t is PropertyTile => t.type === "property" && t.colorGroup === color,
    ).map((t) => t.position),
  ]),
);

export const RAILROAD_POSITIONS = BOARD_TILES.filter(
  (t) => t.type === "railroad",
).map((t) => t.position);

export const UTILITY_POSITIONS = BOARD_TILES.filter(
  (t) => t.type === "utility",
).map((t) => t.position);

export const JAIL_POSITION = 10;
export const GO_TO_JAIL_POSITION = 30;
export const GO_POSITION = 0;
export const GO_SALARY = 200;
export const BOARD_SIZE = 40;

export const BANK_HOUSE_LIMIT = 32;
export const BANK_HOTEL_LIMIT = 12;

// NOTE: House rule — sell houses/hotels back to bank at 75% (official is 50%).
export const HOUSE_SELL_RATE = 0.75;

export const RAILROAD_RENT = [0, 25, 50, 100, 200] as const;

export const UTILITY_MULTIPLIER = [0, 4, 10] as const;

export type CardEffect =
  | { kind: "move_to"; position: number }
  | { kind: "move_relative"; spaces: number }
  | { kind: "move_to_nearest"; tileType: "railroad" | "utility" }
  | { kind: "cash"; amount: number }
  | { kind: "cash_per_player"; amount: number }
  | { kind: "repairs"; houseCost: number; hotelCost: number }
  | { kind: "go_to_jail" }
  | { kind: "get_out_of_jail_free" }
  | { kind: "go_back_spaces"; spaces: number };

export interface Card {
  readonly id: string;
  readonly text: string;
  readonly effect: CardEffect;
}

export const CHANCE_CARDS: readonly Card[] = [
  {
    id: "ch_advance_go",
    text: "Advance to Go (Collect $200)",
    effect: { kind: "move_to", position: 0 },
  },
  {
    id: "ch_advance_illinois",
    text: "Advance to Illinois Avenue. If you pass Go, collect $200",
    effect: { kind: "move_to", position: 24 },
  },
  {
    id: "ch_advance_st_charles",
    text: "Advance to St. Charles Place. If you pass Go, collect $200",
    effect: { kind: "move_to", position: 11 },
  },
  {
    id: "ch_advance_nearest_railroad_1",
    text: "Advance token to nearest Railroad and pay owner twice the rental",
    effect: { kind: "move_to_nearest", tileType: "railroad" },
  },
  {
    id: "ch_advance_nearest_railroad_2",
    text: "Advance token to nearest Railroad and pay owner twice the rental",
    effect: { kind: "move_to_nearest", tileType: "railroad" },
  },
  {
    id: "ch_advance_nearest_utility",
    text: "Advance token to the nearest Utility",
    effect: { kind: "move_to_nearest", tileType: "utility" },
  },
  {
    id: "ch_bank_dividend",
    text: "Bank pays you dividend of $50",
    effect: { kind: "cash", amount: 50 },
  },
  {
    id: "ch_goojf",
    text: "Get out of Jail Free",
    effect: { kind: "get_out_of_jail_free" },
  },
  {
    id: "ch_go_back_3",
    text: "Go Back 3 Spaces",
    effect: { kind: "go_back_spaces", spaces: 3 },
  },
  {
    id: "ch_go_to_jail",
    text: "Go to Jail. Go directly to Jail, do not pass Go, do not collect $200",
    effect: { kind: "go_to_jail" },
  },
  {
    id: "ch_general_repairs",
    text: "Make general repairs on all your property ($25 per house, $100 per hotel)",
    effect: { kind: "repairs", houseCost: 25, hotelCost: 100 },
  },
  {
    id: "ch_poor_tax",
    text: "Pay poor tax of $15",
    effect: { kind: "cash", amount: -15 },
  },
  {
    id: "ch_reading_railroad",
    text: "Take a trip to Reading Railroad. If you pass Go, collect $200",
    effect: { kind: "move_to", position: 5 },
  },
  {
    id: "ch_boardwalk",
    text: "Take a walk on the Boardwalk. Advance token to Boardwalk",
    effect: { kind: "move_to", position: 39 },
  },
  {
    id: "ch_elected_chairman",
    text: "You have been elected Chairman of the Board. Pay each player $50",
    effect: { kind: "cash_per_player", amount: -50 },
  },
  {
    id: "ch_building_loan",
    text: "Your building loan matures. Collect $150",
    effect: { kind: "cash", amount: 150 },
  },
] as const;

export const COMMUNITY_CHEST_CARDS: readonly Card[] = [
  {
    id: "cc_advance_go",
    text: "Advance to Go (Collect $200)",
    effect: { kind: "move_to", position: 0 },
  },
  {
    id: "cc_bank_error",
    text: "Bank error in your favor. Collect $200",
    effect: { kind: "cash", amount: 200 },
  },
  {
    id: "cc_doctor_fee",
    text: "Doctor's fee. Pay $50",
    effect: { kind: "cash", amount: -50 },
  },
  {
    id: "cc_stock_sale",
    text: "From sale of stock you get $50",
    effect: { kind: "cash", amount: 50 },
  },
  {
    id: "cc_goojf",
    text: "Get out of Jail Free",
    effect: { kind: "get_out_of_jail_free" },
  },
  {
    id: "cc_go_to_jail",
    text: "Go to Jail. Go directly to Jail, do not pass Go, do not collect $200",
    effect: { kind: "go_to_jail" },
  },
  {
    id: "cc_grand_opera",
    text: "Grand Opera Night. Collect $50 from every player",
    effect: { kind: "cash_per_player", amount: 50 },
  },
  {
    id: "cc_holiday_fund",
    text: "Holiday Fund matures. Receive $100",
    effect: { kind: "cash", amount: 100 },
  },
  {
    id: "cc_income_tax_refund",
    text: "Income tax refund. Collect $20",
    effect: { kind: "cash", amount: 20 },
  },
  {
    id: "cc_birthday",
    text: "It is your birthday. Collect $10 from every player",
    effect: { kind: "cash_per_player", amount: 10 },
  },
  {
    id: "cc_life_insurance",
    text: "Life insurance matures. Collect $100",
    effect: { kind: "cash", amount: 100 },
  },
  {
    id: "cc_hospital_fee",
    text: "Pay hospital fees of $100",
    effect: { kind: "cash", amount: -100 },
  },
  {
    id: "cc_school_fee",
    text: "Pay school fees of $150",
    effect: { kind: "cash", amount: -150 },
  },
  {
    id: "cc_consultancy_fee",
    text: "Receive $25 consultancy fee",
    effect: { kind: "cash", amount: 25 },
  },
  {
    id: "cc_street_repairs",
    text: "You are assessed for street repairs ($40 per house, $115 per hotel)",
    effect: { kind: "repairs", houseCost: 40, hotelCost: 115 },
  },
  {
    id: "cc_beauty_contest",
    text: "You have won second prize in a beauty contest. Collect $10",
    effect: { kind: "cash", amount: 10 },
  },
  {
    id: "cc_inherit",
    text: "You inherit $100",
    effect: { kind: "cash", amount: 100 },
  },
] as const;
