/** Richup-style property group colors shared across board tiles and panels. */
export interface PropertyColorStyle {
  bg: string;
  text: string;
  border: string;
  hex: string;
  tint: string;
}

export const PROPERTY_COLORS: Record<string, PropertyColorStyle> = {
  brown: {
    bg: "bg-[#955236]",
    text: "text-white",
    border: "border-[#7a4329]",
    hex: "#955236",
    tint: "bg-[#955236]/45",
  },
  light_blue: {
    bg: "bg-[#00aeef]",
    text: "text-white",
    border: "border-[#0090c8]",
    hex: "#00aeef",
    tint: "bg-[#00aeef]/45",
  },
  pink: {
    bg: "bg-[#d93a96]",
    text: "text-white",
    border: "border-[#b82e7d]",
    hex: "#d93a96",
    tint: "bg-[#d93a96]/45",
  },
  orange: {
    bg: "bg-[#f7941d]",
    text: "text-white",
    border: "border-[#d97d0f]",
    hex: "#f7941d",
    tint: "bg-[#f7941d]/45",
  },
  red: {
    bg: "bg-[#ed1b24]",
    text: "text-white",
    border: "border-[#c9151d]",
    hex: "#ed1b24",
    tint: "bg-[#ed1b24]/45",
  },
  yellow: {
    bg: "bg-[#ffcc00]",
    text: "text-[#1a1a1a]",
    border: "border-[#d9ad00]",
    hex: "#ffcc00",
    tint: "bg-[#ffcc00]/40",
  },
  green: {
    bg: "bg-[#007a3d]",
    text: "text-white",
    border: "border-[#006332]",
    hex: "#007a3d",
    tint: "bg-[#007a3d]/45",
  },
  dark_blue: {
    bg: "bg-[#1e3a8a]",
    text: "text-white",
    border: "border-[#162d6e]",
    hex: "#1e3a8a",
    tint: "bg-[#1e3a8a]/45",
  },
};

export const GAME_BG = "#0b0f17";
export const BOARD_CENTER_BG = "#111827";
export const SIDEBAR_BG = "#131a27";

/** Slotted tile surface — no backdrop-blur (blur smears across adjacent grid cells). */
export const MATERIAL_TILE = "material-tile rounded-md";

/** Rail / ledger panel for sidebar and scoreboard frames. */
export const MATERIAL_PANEL = "material-rail rounded-xl overflow-hidden";

/** Printed cardstock surface for overlays and HUD cards. */
export const MATERIAL_CARD = "material-cardstock";

/** @deprecated Prefer MATERIAL_TILE */
export const GLASS_TILE = MATERIAL_TILE;
/** @deprecated Prefer MATERIAL_PANEL */
export const GLASS_PANEL = MATERIAL_PANEL;
/** @deprecated Prefer MATERIAL_CARD */
export const GLASS_CARD = MATERIAL_CARD;

/** NOTE: Board-level text tokens — cqmin here tracks the full board, not individual tiles. */
export const BOARD_TEXT_VARS: Record<string, string> = {
  "--board-text-xs": "clamp(7px, 1.15cqmin, 14px)",
  "--board-text-sm": "clamp(9px, 1.45cqmin, 18px)",
  "--board-text": "clamp(11px, 1.9cqmin, 22px)",
  "--board-text-lg": "clamp(1.1rem, 4.8cqmin, 3rem)",
  "--board-text-xl": "clamp(1.35rem, 6cqmin, 3.5rem)",
  "--board-money": "clamp(7px, 1.2cqmin, 11px)",
};

/** Clear tabular money figures for board prices and cash readouts. */
export const BOARD_MONEY_CLASS =
  "font-mono tabular-nums tracking-tight font-semibold";

/** Full hotel development cost (5 house-equivalents), matching engine valuation. */
export function propertyHotelCost(houseCost: number): number {
  return houseCost * 5;
}

/**
 * Buy / auction overlay — width tracks board cqmin so the card scales with the board.
 * Do not nest another container-type inside; keep cq units on the board/center.
 */
export const BOARD_OVERLAY_PANEL_CLASS =
  "w-[clamp(11.5rem,42cqmin,21rem)] max-h-[min(82cqb,92%)] max-w-[94%] origin-center overflow-x-hidden overflow-y-auto";
