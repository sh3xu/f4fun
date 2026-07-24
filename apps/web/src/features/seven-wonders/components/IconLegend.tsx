"use client";

import type { ReactNode } from "react";
import {
  ClayIcon,
  CoinIcon,
  CompassIcon,
  GearIcon,
  GlassIcon,
  LaurelIcon,
  OreIcon,
  PapyrusIcon,
  ShieldIcon,
  StoneIcon,
  TabletIcon,
  TextileIcon,
  WildScienceIcon,
  WoodIcon,
} from "./icons";

interface LegendItem {
  icon: ReactNode;
  name: string;
  meaning: string;
}

interface LegendGroup {
  title: string;
  blurb: string;
  items: LegendItem[];
}

const ICON_CLASS = "h-5 w-5";

export const ICON_LEGEND_GROUPS: LegendGroup[] = [
  {
    title: "Raw resources",
    blurb:
      "Brown structures produce these. Buy missing ones from neighbors for coins.",
    items: [
      {
        icon: <WoodIcon className={ICON_CLASS} />,
        name: "Wood",
        meaning: "Raw material — trees and lumber.",
      },
      {
        icon: <StoneIcon className={ICON_CLASS} />,
        name: "Stone",
        meaning: "Raw material — quarried stone.",
      },
      {
        icon: <ClayIcon className={ICON_CLASS} />,
        name: "Clay",
        meaning: "Raw material — brick and earthenware.",
      },
      {
        icon: <OreIcon className={ICON_CLASS} />,
        name: "Ore",
        meaning: "Raw material — mined metal.",
      },
    ],
  },
  {
    title: "Manufactured goods",
    blurb:
      "Grey structures produce these. Same trading rules as raw, often via different trading posts.",
    items: [
      {
        icon: <GlassIcon className={ICON_CLASS} />,
        name: "Glass",
        meaning: "Manufactured good.",
      },
      {
        icon: <PapyrusIcon className={ICON_CLASS} />,
        name: "Papyrus",
        meaning: "Manufactured good — paper and scrolls.",
      },
      {
        icon: <TextileIcon className={ICON_CLASS} />,
        name: "Textile",
        meaning: "Manufactured good — cloth and loom work.",
      },
    ],
  },
  {
    title: "Status & rewards",
    blurb: "Shown on seats, cards, and wonder stages.",
    items: [
      {
        icon: <CoinIcon className={ICON_CLASS} />,
        name: "Coins",
        meaning:
          "Treasury. Spend to trade or pay coin costs. Every 3 leftover coins = 1 victory point at game end.",
      },
      {
        icon: <ShieldIcon className={ICON_CLASS} />,
        name: "Shields",
        meaning:
          "Military strength. Compared with neighbors at the end of each age for war tokens.",
      },
      {
        icon: <LaurelIcon className={ICON_CLASS} />,
        name: "Victory points",
        meaning:
          "Laurels on cards and wonders are points scored immediately or at game end.",
      },
    ],
  },
  {
    title: "Science symbols",
    blurb:
      "Green cards. Sets of different symbols and multiples of the same both score — wilds fill any gap.",
    items: [
      {
        icon: <CompassIcon className={ICON_CLASS} />,
        name: "Compass",
        meaning: "Science symbol (geometry / tools of study).",
      },
      {
        icon: <TabletIcon className={ICON_CLASS} />,
        name: "Tablet",
        meaning: "Science symbol (writing / scholarship).",
      },
      {
        icon: <GearIcon className={ICON_CLASS} />,
        name: "Gear",
        meaning: "Science symbol (engineering / invention).",
      },
      {
        icon: <WildScienceIcon className={ICON_CLASS} />,
        name: "Wild science",
        meaning: "Counts as whichever science symbol helps you most.",
      },
    ],
  },
  {
    title: "Card colours",
    blurb:
      "Colour tells you the structure type. Dots on commerce / guild effects refer to these colours.",
    items: [
      {
        icon: <ColourSwatch className="bg-amber-700" />,
        name: "Brown",
        meaning: "Raw resource producers.",
      },
      {
        icon: <ColourSwatch className="bg-zinc-400" />,
        name: "Grey",
        meaning: "Manufactured goods producers.",
      },
      {
        icon: <ColourSwatch className="bg-sky-500" />,
        name: "Blue",
        meaning: "Civic buildings — victory points.",
      },
      {
        icon: <ColourSwatch className="bg-yellow-400" />,
        name: "Yellow",
        meaning: "Commerce — coins, cheaper trade, end-game bonuses.",
      },
      {
        icon: <ColourSwatch className="bg-rose-500" />,
        name: "Red",
        meaning: "Military — shields for age battles.",
      },
      {
        icon: <ColourSwatch className="bg-emerald-500" />,
        name: "Green",
        meaning: "Science — compass, tablet, or gear.",
      },
      {
        icon: <ColourSwatch className="bg-violet-500" />,
        name: "Purple",
        meaning: "Guilds (Age III) — score off neighbors or your own city.",
      },
    ],
  },
  {
    title: "On cards & actions",
    blurb: "Badges and shorthand you will see while drafting.",
    items: [
      {
        icon: <Badge label="Chain" />,
        name: "Chain",
        meaning: "Free to build — a prerequisite in your city unlocks it.",
      },
      {
        icon: <Badge label="Trade N" />,
        name: "Trade cost",
        meaning: "You can build by paying N coins to neighbors for resources.",
      },
      {
        icon: <Badge label="Too costly" tone="danger" />,
        name: "Too costly",
        meaning: "Not enough coins / resources to build this now.",
      },
      {
        icon: <Badge label="Owned" />,
        name: "Owned",
        meaning:
          "You already have a structure with this name — cannot rebuild.",
      },
      {
        icon: <Badge label="A or B" />,
        name: "Choice production",
        meaning:
          "Brown/grey choice cards produce one resource from the options each turn — not both.",
      },
      {
        icon: <Badge label="raw @1" />,
        name: "Trading post",
        meaning:
          "Buy raw (or goods) from the shown neighbor for 1 coin instead of 2. Arrows show west (←), east (→), or both (↔).",
      },
      {
        icon: <Badge label="Free build" />,
        name: "Free build",
        meaning:
          "Wonder power — build one card this age without paying its cost.",
      },
      {
        icon: <Badge label="Raise fallen" />,
        name: "From the ruins",
        meaning:
          "Wonder power — build one card from the discard pile for free.",
      },
      {
        icon: <Badge label="N×own" />,
        name: "Per-card bonuses",
        meaning:
          "Coins or points times your own (or neighbors’) cards of the coloured type shown beside it.",
      },
    ],
  },
  {
    title: "Seat strip",
    blurb: "The player row at the top of the table.",
    items: [
      {
        icon: <StageBars filled={2} total={3} />,
        name: "Wonder stages",
        meaning: "Lit bars = stages built. Dim bars = still unfinished.",
      },
      {
        icon: <Badge label="✓" />,
        name: "Pick locked",
        meaning: "That empire has submitted its choice for this turn.",
      },
      {
        icon: <Badge label="…" />,
        name: "Still choosing",
        meaning: "Waiting on that seat before the turn can resolve.",
      },
      {
        icon: <Badge label="I II III" />,
        name: "Ages",
        meaning:
          "Three ages. Hands pass left in I and III, right in II. War is scored at the end of each age.",
      },
    ],
  },
];

function StageBars({ filled, total }: { filled: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={`stage-bar-${i + 1}`}
          className={
            i < filled
              ? "h-1.5 w-3 rounded-sm bg-amber-400"
              : "h-1.5 w-3 rounded-sm bg-white/15"
          }
        />
      ))}
    </span>
  );
}

function ColourSwatch({ className }: { className: string }) {
  return (
    <span
      className={`h-4 w-4 shrink-0 rounded-full border border-white/20 ${className}`}
      aria-hidden
    />
  );
}

function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <span
      className={
        tone === "danger"
          ? "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-200 ring-1 ring-rose-400/40"
          : "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100/80 ring-1 ring-amber-400/30"
      }
    >
      {label}
    </span>
  );
}

export function IconLegend() {
  return (
    <div className="space-y-5">
      {ICON_LEGEND_GROUPS.map((group) => (
        <section key={group.title}>
          <h3 className="mb-1 text-[11px] font-black uppercase tracking-[0.22em] text-amber-300/80">
            {group.title}
          </h3>
          <p className="mb-2.5 text-xs leading-relaxed text-amber-100/55">
            {group.blurb}
          </p>
          <ul className="space-y-2">
            {group.items.map((item) => (
              <li
                key={item.name}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black/35">
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-amber-50">
                    {item.name}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-amber-100/65">
                    {item.meaning}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
