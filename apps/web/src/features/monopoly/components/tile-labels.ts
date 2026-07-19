/**
 * Engine keeps classic street names; UI shows these labels.
 */
import {
  CHANCE_CARDS,
  COMMUNITY_CHEST_CARDS,
  TILE_BY_POSITION,
} from "@f4fun/monopoly-engine";

const SHORT_NAMES: Record<string, string> = {
  // Brown — Brazil
  "Mediterranean Avenue": "Rio",
  "Baltic Avenue": "Belem",
  // Light blue — India
  "Oriental Avenue": "Goa",
  "Vermont Avenue": "Pune",
  "Connecticut Avenue": "Agra",
  // Pink — South Korea
  "St. Charles Place": "Seoul",
  "States Avenue": "Busan",
  "Virginia Avenue": "Daegu",
  // Orange — Japan
  "St. James Place": "Tokyo",
  "Tennessee Avenue": "Osaka",
  "New York Avenue": "Kyoto",
  // Red — Italy
  "Kentucky Avenue": "Rome",
  "Indiana Avenue": "Milan",
  "Illinois Avenue": "Pisa",
  // Yellow — France
  "Atlantic Avenue": "Paris",
  "Ventnor Avenue": "Lyon",
  "Marvin Gardens": "Nice",
  // Green — Spain
  "Pacific Avenue": "Leon",
  "North Carolina Avenue": "Vigo",
  "Pennsylvania Avenue": "Cadiz",
  // Dark blue — UAE
  "Park Place": "Dubai",
  Boardwalk: "Ajman",
  // Railroads — USA
  "Reading Railroad": "Reno Rail",
  "Pennsylvania Railroad": "Tulsa Rail",
  "B&O Railroad": "Omaha Rail",
  "Short Line Railroad": "Boise Rail",
  // Utilities — Norway
  "Electric Company": "Electricity",
  "Water Works": "Water Co.",
  // Specials
  "Community Chest": "Chest",
  Chance: "Chance",
  "Income Tax": "Tax",
  "Luxury Tax": "Lux. Tax",
  "Jail / Just Visiting": "Jail",
  "Free Parking": "Parking",
  "Go To Jail": "Go Jail",
  GO: "GO",
};

/** Longest-first so compound names (e.g. St. Charles Place) replace cleanly. */
const ENGINE_NAMES_BY_LENGTH = Object.keys(SHORT_NAMES).sort(
  (a, b) => b.length - a.length,
);

export function getTileLabel(name: string): string {
  return SHORT_NAMES[name] ?? name;
}

export function getTileLabelAt(position: number): string {
  const tile = TILE_BY_POSITION.get(position);
  return tile ? getTileLabel(tile.name) : `Tile ${position}`;
}

/** Rewrites classic place names in Chance/CC copy to match board UI labels. */
export function localizeCardText(text: string): string {
  let result = text;
  for (const name of ENGINE_NAMES_BY_LENGTH) {
    if (result.includes(name)) {
      result = result.split(name).join(SHORT_NAMES[name]);
    }
  }
  return result;
}

export function getCardDisplayText(
  deck: "chance" | "community_chest",
  cardId: string,
): string | null {
  const cards = deck === "chance" ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS;
  const text = cards.find((c) => c.id === cardId)?.text;
  return text ? localizeCardText(text) : null;
}
