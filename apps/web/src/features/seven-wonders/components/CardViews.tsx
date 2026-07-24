"use client";

import {
  type CardColour,
  type CardEffect,
  getCardById,
  getWonderById,
  type Resource,
  type ResourceCost,
  type WonderStageEffect,
} from "@f4fun/seven-wonders-engine";
import { motion, useReducedMotion } from "framer-motion";
import { Link2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  CoinIcon,
  LaurelIcon,
  ResourceIcon,
  ScienceIcon,
  ShieldIcon,
} from "./icons";

interface ColourTheme {
  band: string;
  face: string;
  text: string;
  glow: string;
  label: string;
}

const COLOUR_THEMES: Record<CardColour, ColourTheme> = {
  brown: {
    band: "from-amber-800 to-amber-950",
    face: "from-[#2b2018] to-[#1c140e]",
    text: "text-amber-100",
    glow: "shadow-amber-700/40",
    label: "Raw material",
  },
  grey: {
    band: "from-zinc-500 to-zinc-800",
    face: "from-[#26282c] to-[#17181b]",
    text: "text-zinc-100",
    glow: "shadow-zinc-400/30",
    label: "Manufactured",
  },
  blue: {
    band: "from-sky-600 to-sky-900",
    face: "from-[#14232f] to-[#0d161e]",
    text: "text-sky-100",
    glow: "shadow-sky-500/40",
    label: "Civic",
  },
  yellow: {
    band: "from-yellow-500 to-yellow-800",
    face: "from-[#2b2410] to-[#1b170a]",
    text: "text-yellow-100",
    glow: "shadow-yellow-500/40",
    label: "Commerce",
  },
  red: {
    band: "from-rose-600 to-rose-950",
    face: "from-[#2c1518] to-[#1c0d0f]",
    text: "text-rose-100",
    glow: "shadow-rose-500/40",
    label: "Military",
  },
  green: {
    band: "from-emerald-600 to-emerald-950",
    face: "from-[#122922] to-[#0b1a15]",
    text: "text-emerald-100",
    glow: "shadow-emerald-500/40",
    label: "Science",
  },
  purple: {
    band: "from-violet-600 to-violet-950",
    face: "from-[#221731] to-[#150e1f]",
    text: "text-violet-100",
    glow: "shadow-violet-500/40",
    label: "Guild",
  },
};

const AGE_NUMERALS = { 1: "I", 2: "II", 3: "III" } as const;

export type Affordability =
  | { kind: "free" }
  | { kind: "chain" }
  | { kind: "trade"; coins: number }
  | { kind: "owned" }
  | { kind: "blocked" };

function resourceEntries(cost: ResourceCost): [Resource, number][] {
  return Object.entries(cost).filter(([, n]) => (n ?? 0) > 0) as [
    Resource,
    number,
  ][];
}

function RepeatIcons({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: identical decorative repeats, list never reorders
        <span key={i}>{children}</span>
      ))}
    </span>
  );
}

/** Icon-first rendering shared by hand cards, tableau chips and wonder stages. */
export function EffectIcons({
  effect,
  iconClass = "h-5 w-5",
}: {
  effect: CardEffect | WonderStageEffect;
  iconClass?: string;
}) {
  switch (effect.type) {
    case "produce":
      return (
        <span className="inline-flex flex-wrap items-center justify-center gap-1">
          {effect.options.map((option, i) => (
            <span
              key={option.join("-")}
              className="inline-flex items-center gap-1"
            >
              {i > 0 && <span className="text-[10px] opacity-60">or</span>}
              {option.map((r) => (
                <ResourceIcon key={r} resource={r} className={iconClass} />
              ))}
            </span>
          ))}
        </span>
      );
    case "produceAll":
      return (
        <span className="inline-flex items-center gap-1">
          {resourceEntries(effect.resources).map(([r, n]) => (
            <RepeatIcons key={r} count={n}>
              <ResourceIcon resource={r} className={iconClass} />
            </RepeatIcons>
          ))}
        </span>
      );
    case "coins":
      return (
        <span className="inline-flex items-center gap-1 font-bold">
          <CoinIcon className={iconClass} />
          {effect.amount}
        </span>
      );
    case "points":
      return (
        <span className="inline-flex items-center gap-1 font-bold">
          <LaurelIcon className={iconClass} />
          {effect.amount}
        </span>
      );
    case "shields":
      return (
        <RepeatIcons count={effect.amount}>
          <ShieldIcon className={iconClass} />
        </RepeatIcons>
      );
    case "science":
      return <ScienceIcon symbol={effect.symbol} className={iconClass} />;
    case "playDiscarded":
      return (
        <span className="text-[11px] font-semibold">Raise the fallen</span>
      );
    case "freeBuild":
      return (
        <span className="text-[11px] font-semibold">Free build / age</span>
      );
    case "tradingPost":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
          {effect.direction === "left" && "←"}
          {effect.direction === "both" && "↔"}
          {effect.direction === "right" && "→"}
          <span>{effect.kind === "raw" ? "raw" : "goods"} @1</span>
          <CoinIcon className="h-3.5 w-3.5" />
        </span>
      );
    case "coinsFromCards":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
          <CoinIcon className="h-3.5 w-3.5" />
          {effect.self > 0 && `${effect.self}×own`}
          {effect.self > 0 && effect.neighbors > 0 && " · "}
          {effect.neighbors > 0 && `${effect.neighbors}×nbr`}
          <ColourDot colour={effect.colour} />
        </span>
      );
    case "endGamePoints":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
          <LaurelIcon className="h-3.5 w-3.5" />
          {effect.self > 0 && `${effect.self}×own`}
          {effect.self > 0 && effect.neighbors > 0 && " · "}
          {effect.neighbors > 0 && `${effect.neighbors}×nbr`}
          <ColourDot colour={effect.colour} />
        </span>
      );
    case "guild":
      return <GuildEffect scoring={effect.scoring} />;
    default:
      return null;
  }
}

function ColourDot({ colour }: { colour: CardColour | "wonderStages" }) {
  if (colour === "wonderStages") {
    return <span className="text-[10px] uppercase opacity-70">stages</span>;
  }
  const dot: Record<CardColour, string> = {
    brown: "bg-amber-700",
    grey: "bg-zinc-400",
    blue: "bg-sky-500",
    yellow: "bg-yellow-400",
    red: "bg-rose-500",
    green: "bg-emerald-500",
    purple: "bg-violet-500",
  };
  return <span className={cn("h-2.5 w-2.5 rounded-full", dot[colour])} />;
}

function GuildEffect({
  scoring,
}: {
  scoring: Extract<CardEffect, { type: "guild" }>["scoring"];
}) {
  switch (scoring.kind) {
    case "countNeighbourCards":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
          <LaurelIcon className="h-3.5 w-3.5" />
          {scoring.perCard}×nbr
          <ColourDot colour={scoring.colour} />
        </span>
      );
    case "countNeighbourWonderStages":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
          <LaurelIcon className="h-3.5 w-3.5" />
          {scoring.perStage}×nbr stage
        </span>
      );
    case "countOwnCards":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
          <LaurelIcon className="h-3.5 w-3.5" />
          {scoring.perCard}×own
          {scoring.colours.map((c) => (
            <ColourDot key={c} colour={c} />
          ))}
        </span>
      );
    case "scienceWild":
      return <ScienceIcon symbol="wild" className="h-5 w-5" />;
    default:
      return null;
  }
}

function CostRow({
  cost,
  hasChain,
}: {
  cost: { coins?: number; resources?: ResourceCost };
  hasChain: boolean;
}) {
  const resources = resourceEntries(cost.resources ?? {});
  const isFree = !cost.coins && resources.length === 0;

  return (
    <div className="flex items-center gap-1">
      {isFree ? (
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
          Free
        </span>
      ) : (
        <>
          {cost.coins ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold">
              <CoinIcon className="h-3.5 w-3.5" />
              {cost.coins}
            </span>
          ) : null}
          {resources.map(([r, n]) => (
            <RepeatIcons key={r} count={n}>
              <ResourceIcon resource={r} className="h-3.5 w-3.5" />
            </RepeatIcons>
          ))}
        </>
      )}
      {hasChain && (
        <Link2
          className="ml-auto h-3 w-3 text-emerald-300"
          aria-label="Can be built free via a chain"
        />
      )}
    </div>
  );
}

function AffordabilityBadge({ status }: { status: Affordability }) {
  switch (status.kind) {
    case "free":
      return null;
    case "chain":
      return (
        <span className="rounded-full bg-emerald-500/90 px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-emerald-950">
          Chain
        </span>
      );
    case "trade":
      return (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-400/90 px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-yellow-950">
          Trade {status.coins}
        </span>
      );
    case "owned":
      return (
        <span className="rounded-full bg-zinc-500/90 px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-zinc-950">
          Owned
        </span>
      );
    case "blocked":
      return (
        <span className="rounded-full bg-rose-500/90 px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-rose-950">
          Too costly
        </span>
      );
  }
}

export function WonderCard({
  cardId,
  selected,
  disabled,
  onSelect,
  affordability,
}: {
  cardId: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  affordability?: Affordability;
}) {
  const reduceMotion = useReducedMotion();
  const card = getCardById(cardId);
  const theme = COLOUR_THEMES[card.colour];
  const interactive = Boolean(onSelect) && !disabled;
  const hasChain = (card.freeChainFrom?.length ?? 0) > 0;

  return (
    <motion.button
      type="button"
      disabled={!interactive}
      onClick={onSelect}
      whileHover={interactive && !reduceMotion ? { y: -10, scale: 1.04 } : {}}
      whileTap={interactive && !reduceMotion ? { scale: 0.97 } : {}}
      animate={selected && !reduceMotion ? { y: -14 } : { y: 0 }}
      className={cn(
        "relative flex h-44 w-30 min-w-30 flex-col overflow-hidden rounded-lg border text-left shadow-lg",
        "border-black/60 bg-gradient-to-b",
        theme.face,
        theme.text,
        selected &&
          cn(
            "ring-2 ring-amber-300 shadow-xl",
            theme.glow,
            "border-amber-300/70",
          ),
        interactive && "cursor-pointer",
        disabled && "opacity-45 saturate-50",
        !interactive && !disabled && "cursor-default",
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-1 bg-gradient-to-r px-2 py-1.5",
          theme.band,
        )}
      >
        <span className="text-[11px] font-black leading-tight drop-shadow-sm">
          {card.name}
        </span>
        <span className="rounded-sm bg-black/35 px-1 text-[9px] font-black">
          {AGE_NUMERALS[card.age]}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center px-2 py-1 text-center">
        <EffectIcons effect={card.effect} iconClass="h-6 w-6" />
      </div>

      <p className="px-2 pb-1 text-center text-[8px] font-bold uppercase tracking-[0.16em] opacity-50">
        {theme.label}
      </p>

      <div className="border-t border-white/10 bg-black/30 px-2 py-1.5">
        <CostRow cost={card.cost} hasChain={hasChain} />
      </div>

      {affordability && (
        <div className="absolute right-1 top-8">
          <AffordabilityBadge status={affordability} />
        </div>
      )}
    </motion.button>
  );
}

/** Compact built-card chip stacked inside a city column. */
function CityChip({ cardId }: { cardId: string }) {
  const card = getCardById(cardId);
  const theme = COLOUR_THEMES[card.colour];
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border border-black/50 bg-gradient-to-r px-2 py-1",
        theme.band,
        theme.text,
      )}
    >
      <span className="truncate text-[11px] font-bold drop-shadow-sm">
        {card.name}
      </span>
      <EffectIcons effect={card.effect} iconClass="h-3.5 w-3.5" />
    </div>
  );
}

const CITY_COLUMN_ORDER: readonly CardColour[] = [
  "brown",
  "grey",
  "yellow",
  "red",
  "blue",
  "green",
  "purple",
];

export function CityTableau({ tableau }: { tableau: string[] }) {
  if (tableau.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-amber-200/15 px-3 py-4 text-center text-sm text-amber-100/40">
        Your city is empty — build your first structure
      </p>
    );
  }

  const byColour = new Map<CardColour, string[]>();
  for (const id of tableau) {
    const colour = getCardById(id).colour;
    byColour.set(colour, [...(byColour.get(colour) ?? []), id]);
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      {CITY_COLUMN_ORDER.filter((c) => byColour.has(c)).map((colour) => (
        <div key={colour} className="flex w-40 flex-col gap-1">
          {(byColour.get(colour) ?? []).map((id) => (
            <CityChip key={id} cardId={id} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function WonderBoard({
  wonderId,
  stagesBuilt,
}: {
  wonderId: string;
  stagesBuilt: number;
}) {
  const wonder = getWonderById(wonderId);

  return (
    <div className="overflow-hidden rounded-xl border border-amber-400/25 bg-gradient-to-b from-[#2a2013] to-[#191208] shadow-lg shadow-black/50">
      <div className="flex items-center justify-between gap-2 border-b border-amber-400/15 bg-black/30 px-3 py-2">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-200/60">
            Your wonder
          </p>
          <p className="text-sm font-black text-amber-50">{wonder.name}</p>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-black/40 px-2 py-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-100/60">
            Produces
          </span>
          <ResourceIcon
            resource={wonder.startingResource}
            className="h-4 w-4"
          />
        </div>
      </div>

      <div className="flex gap-2 px-3 py-3">
        {wonder.stages.map((stage, i) => {
          const built = i < stagesBuilt;
          const isNext = i === stagesBuilt;
          return (
            <div
              key={`${wonder.id}-stage-${i + 1}`}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 rounded-lg border px-2 py-2 transition-colors",
                built
                  ? "border-amber-300/60 bg-amber-400/15 shadow-inner shadow-amber-500/20"
                  : isNext
                    ? "border-amber-200/30 bg-black/25"
                    : "border-white/8 bg-black/20 opacity-60",
              )}
            >
              <span
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  built ? "text-amber-200" : "text-amber-100/40",
                )}
              >
                {built ? "Built" : isNext ? "Next" : `Stage ${i + 1}`}
              </span>
              <div className="text-amber-50">
                <EffectIcons effect={stage.effect} iconClass="h-5 w-5" />
              </div>
              <div className="mt-auto flex items-center gap-0.5 rounded bg-black/35 px-1.5 py-0.5">
                {resourceEntries(stage.cost).map(([r, n]) => (
                  <RepeatIcons key={r} count={n}>
                    <ResourceIcon resource={r} className="h-3 w-3" />
                  </RepeatIcons>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
