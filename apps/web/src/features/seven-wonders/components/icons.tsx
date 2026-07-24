import type { Resource, Science } from "@f4fun/seven-wonders-engine";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// NOTE: Hand-drawn SVG game assets for Empires of Dawn — kept inline so cards
// stay crisp at any scale without extra network fetches.

interface IconProps {
  className?: string;
  title?: string;
}

function Svg({
  className,
  title,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4 shrink-0", className)}
      role="img"
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function WoodIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Wood">
      <rect x="3" y="9" width="18" height="6" rx="3" fill="#8a5a2b" />
      <circle cx="6" cy="12" r="2.4" fill="#d9a066" />
      <circle cx="6" cy="12" r="1.2" fill="#8a5a2b" />
      <path
        d="M10 10.5h9M10 13.5h9"
        stroke="#5c3a17"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function StoneIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Stone">
      <path d="M5 19 7 8h10l2 11z" fill="#9aa3ad" />
      <path d="M7 8h10l-1.2-3H8.2z" fill="#c3cad2" />
      <path d="M5 19 7 8l4 3-1.5 8z" fill="#7d8791" />
    </Svg>
  );
}

export function ClayIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Clay">
      <path
        d="M8 5h8c-1 2-1 3 .8 4.6a6 6 0 1 1-9.6 0C9 8 9 7 8 5z"
        fill="#b8563a"
      />
      <path
        d="M8 5h8c-.5 1-.7 1.7-.4 2.5H8.4C8.7 6.7 8.5 6 8 5z"
        fill="#d97b5c"
      />
      <ellipse cx="12" cy="15" rx="4.2" ry="1.4" fill="#93402a" />
    </Svg>
  );
}

export function OreIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Ore">
      <path d="m12 3 7 5-2.4 11H7.4L5 8z" fill="#4b5563" />
      <path d="m12 3 7 5-4 1.5L12 6z" fill="#6b7280" />
      <circle cx="10.4" cy="12.6" r="1.5" fill="#f3c14b" />
      <circle cx="14.6" cy="15.4" r="1" fill="#f3c14b" />
    </Svg>
  );
}

export function GlassIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Glass">
      <path d="M12 3 19 10l-7 11L5 10z" fill="#67c7ee" />
      <path d="M12 3 19 10h-7z" fill="#a5e2f7" />
      <path d="M12 3 5 10h7z" fill="#8fd7f3" />
      <path d="m5 10 7 11V10z" fill="#3fa9d6" />
    </Svg>
  );
}

export function PapyrusIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Papyrus">
      <rect x="6" y="4" width="12" height="16" rx="1.5" fill="#efd9a7" />
      <path d="M6 4c-2 0-2 3 0 3zM18 20c2 0 2-3 0-3z" fill="#d4b878" />
      <path
        d="M9 8.5h6M9 11.5h6M9 14.5h4"
        stroke="#8a6f3c"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function TextileIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Textile">
      <path d="M4 7c3-2.5 13-2.5 16 0v10c-3 2.5-13 2.5-16 0z" fill="#8d6ac8" />
      <path
        d="M7 6v12M11 5.2v13.6M15 5.2v13.6M4 10.5c5 2 11 2 16 0M4 14c5 2 11 2 16 0"
        stroke="#6a4aa3"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export function CoinIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Coins">
      <circle cx="12" cy="12" r="9" fill="#e8b93c" />
      <circle cx="12" cy="12" r="6.6" fill="#f6d879" />
      <path
        d="M12 8.2v7.6M9.6 10.2c0-2.6 4.8-2.6 4.8 0 0 2.4-4.8 1.4-4.8 3.8 0 2.6 4.8 2.6 4.8 0"
        stroke="#a8791b"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Military shields">
      <path
        d="M12 2.8 19.5 5.5v6c0 5-3.2 8.3-7.5 9.7-4.3-1.4-7.5-4.7-7.5-9.7v-6z"
        fill="#d64545"
      />
      <path d="M12 2.8 19.5 5.5v6c0 5-3.2 8.3-7.5 9.7z" fill="#b23333" />
      <path
        d="M12 6.5v10M8.5 10.5h7"
        stroke="#ffe1c4"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LaurelIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Victory points">
      <path
        d="M5 6c-1 5 1.5 10.5 7 12.5C17.5 16.5 20 11 19 6"
        stroke="#7fb96a"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M5.4 8.5 3.2 7.6M6 11.4l-2.3-.2M7.4 14l-2 .8M9.4 16.2l-1.3 1.6M18.6 8.5l2.2-.9M18 11.4l2.3-.2M16.6 14l2 .8M14.6 16.2l1.3 1.6"
        stroke="#7fb96a"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CompassIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Compass">
      <path
        d="M12 3.5 6 19M12 3.5 18 19"
        stroke="#3d7a4e"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="4.5" r="2" fill="#3d7a4e" />
      <path
        d="M8.2 13.4a7.6 7.6 0 0 0 7.6 0"
        stroke="#3d7a4e"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function TabletIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Tablet">
      <path d="M6 4h12l1 3v13H5V7z" fill="#c9a15c" />
      <path d="M6 4h12l1 3H5z" fill="#e0bd7d" />
      <path
        d="M8 10h8M8 13h8M8 16h5"
        stroke="#7d5c26"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function GearIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Gear">
      <path
        d="M12 2.6 13.6 5.4a7 7 0 0 1 2.4 1L19 5.2 20.8 8.4l-2.2 2a7 7 0 0 1 0 3.2l2.2 2L19 18.8l-3-1.2a7 7 0 0 1-2.4 1L12 21.4l-1.6-2.8a7 7 0 0 1-2.4-1l-3 1.2L3.2 15.6l2.2-2a7 7 0 0 1 0-3.2l-2.2-2L5 5.2l3 1.2a7 7 0 0 1 2.4-1z"
        fill="#b0672f"
      />
      <circle cx="12" cy="12" r="3" fill="#f2e3c9" />
    </Svg>
  );
}

export function WildScienceIcon({ className }: IconProps) {
  return (
    <Svg className={className} title="Any science symbol">
      <path
        d="m12 2.5 2.5 6 6.4.3-5 4.1 1.7 6.2L12 15.6l-5.6 3.5 1.7-6.2-5-4.1 6.4-.3z"
        fill="#8d6ac8"
      />
    </Svg>
  );
}

const RESOURCE_ICONS: Record<Resource, (p: IconProps) => ReactNode> = {
  wood: WoodIcon,
  stone: StoneIcon,
  clay: ClayIcon,
  ore: OreIcon,
  glass: GlassIcon,
  papyrus: PapyrusIcon,
  textile: TextileIcon,
};

const SCIENCE_ICONS: Record<Science, (p: IconProps) => ReactNode> = {
  compass: CompassIcon,
  tablet: TabletIcon,
  gear: GearIcon,
  wild: WildScienceIcon,
};

export function ResourceIcon({
  resource,
  className,
}: IconProps & { resource: Resource }) {
  const Icon = RESOURCE_ICONS[resource];
  return <Icon className={className} />;
}

export function ScienceIcon({
  symbol,
  className,
}: IconProps & { symbol: Science }) {
  const Icon = SCIENCE_ICONS[symbol];
  return <Icon className={className} />;
}
