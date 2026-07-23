export interface PlayerColor {
  name: string;
  hex: string;
  bg: string;
  border: string;
  ring: string;
}

export const PLAYER_COLORS: PlayerColor[] = [
  {
    name: "Red",
    hex: "#ef4444",
    bg: "bg-red-500",
    border: "border-red-500",
    ring: "ring-red-500",
  },
  {
    name: "Blue",
    hex: "#3b82f6",
    bg: "bg-blue-500",
    border: "border-blue-500",
    ring: "ring-blue-500",
  },
  {
    name: "Green",
    hex: "#10b981",
    bg: "bg-emerald-500",
    border: "border-emerald-500",
    ring: "ring-emerald-500",
  },
  {
    name: "Yellow",
    hex: "#f59e0b",
    bg: "bg-amber-500",
    border: "border-amber-500",
    ring: "ring-amber-500",
  },
  {
    name: "Purple",
    hex: "#8b5cf6",
    bg: "bg-violet-500",
    border: "border-violet-500",
    ring: "ring-violet-500",
  },
  {
    name: "Pink",
    hex: "#ec4899",
    bg: "bg-pink-500",
    border: "border-pink-500",
    ring: "ring-pink-500",
  },
  {
    name: "Cyan",
    hex: "#06b6d4",
    bg: "bg-cyan-500",
    border: "border-cyan-500",
    ring: "ring-cyan-500",
  },
  {
    name: "Brown",
    hex: "#78350f",
    bg: "bg-amber-900",
    border: "border-amber-900",
    ring: "ring-amber-900",
  },
];

export function getPlayerColor(
  playerId: string,
  turnOrder: string[],
): PlayerColor {
  const index = turnOrder.indexOf(playerId);
  if (index === -1) return PLAYER_COLORS[0];
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
