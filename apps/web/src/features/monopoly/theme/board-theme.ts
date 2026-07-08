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
    tint: "bg-[#955236]/25",
  },
  light_blue: {
    bg: "bg-[#00aeef]",
    text: "text-white",
    border: "border-[#0090c8]",
    hex: "#00aeef",
    tint: "bg-[#00aeef]/25",
  },
  pink: {
    bg: "bg-[#d93a96]",
    text: "text-white",
    border: "border-[#b82e7d]",
    hex: "#d93a96",
    tint: "bg-[#d93a96]/25",
  },
  orange: {
    bg: "bg-[#f7941d]",
    text: "text-white",
    border: "border-[#d97d0f]",
    hex: "#f7941d",
    tint: "bg-[#f7941d]/25",
  },
  red: {
    bg: "bg-[#ed1b24]",
    text: "text-white",
    border: "border-[#c9151d]",
    hex: "#ed1b24",
    tint: "bg-[#ed1b24]/25",
  },
  yellow: {
    bg: "bg-[#ffcc00]",
    text: "text-[#1a1a1a]",
    border: "border-[#d9ad00]",
    hex: "#ffcc00",
    tint: "bg-[#ffcc00]/20",
  },
  green: {
    bg: "bg-[#007a3d]",
    text: "text-white",
    border: "border-[#006332]",
    hex: "#007a3d",
    tint: "bg-[#007a3d]/25",
  },
  dark_blue: {
    bg: "bg-[#1e3a8a]",
    text: "text-white",
    border: "border-[#162d6e]",
    hex: "#1e3a8a",
    tint: "bg-[#1e3a8a]/25",
  },
};

export const GAME_BG = "#0b0f17";
export const BOARD_CENTER_BG = "#111827";
export const SIDEBAR_BG = "#131a27";

/** Frosted-glass surface for board tiles — transparency only, no backdrop-blur (blur smears across adjacent grid cells). */
export const GLASS_TILE =
  "bg-[rgba(18,26,40,0.52)] border border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]";

export const GLASS_PANEL =
  "bg-white/[0.06] backdrop-blur-md border border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.35)] rounded-2xl";

export const GLASS_CARD =
  "bg-white/[0.08] backdrop-blur-sm border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] rounded-xl";
