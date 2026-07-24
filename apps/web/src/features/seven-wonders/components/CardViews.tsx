"use client";

import {
  type CardColour,
  type CardDef,
  getCardById,
  getWonderById,
} from "@f4fun/seven-wonders-engine";
import { cn } from "@/lib/cn";

const COLOUR_STYLES: Record<CardColour, string> = {
  brown: "border-amber-800/60 bg-amber-950/50 text-amber-100",
  grey: "border-zinc-500/50 bg-zinc-800/60 text-zinc-100",
  blue: "border-sky-500/50 bg-sky-950/50 text-sky-100",
  yellow: "border-yellow-500/50 bg-yellow-950/40 text-yellow-100",
  red: "border-rose-500/50 bg-rose-950/50 text-rose-100",
  green: "border-emerald-500/50 bg-emerald-950/50 text-emerald-100",
  purple: "border-violet-500/50 bg-violet-950/50 text-violet-100",
};

function effectLabel(card: CardDef): string {
  const e = card.effect;
  switch (e.type) {
    case "produce":
      return e.options.map((o) => o.join("/")).join(" or ");
    case "produceAll":
      return Object.entries(e.resources)
        .map(([r, n]) => `${n} ${r}`)
        .join(", ");
    case "coins":
      return `+${e.amount} coins`;
    case "points":
      return `${e.amount} VP`;
    case "shields":
      return `${e.amount} shield${e.amount === 1 ? "" : "s"}`;
    case "science":
      return e.symbol;
    case "tradingPost":
      return `Trade ${e.kind} (${e.direction}) @1`;
    case "coinsFromCards": {
      const parts: string[] = [];
      if (e.self > 0) {
        parts.push(`+${e.self}$/own ${e.colour}`);
      }
      if (e.neighbors > 0) {
        parts.push(`+${e.neighbors}$/neighbor ${e.colour}`);
      }
      return parts.join(" · ") || `Coins from ${e.colour}`;
    }
    case "endGamePoints": {
      const parts: string[] = [];
      if (e.self > 0) {
        parts.push(`${e.self} VP/own ${e.colour}`);
      }
      if (e.neighbors > 0) {
        parts.push(`${e.neighbors} VP/neighbor ${e.colour}`);
      }
      return parts.join(" · ") || `VP from ${e.colour}`;
    }
    case "guild": {
      const s = e.scoring;
      switch (s.kind) {
        case "countNeighbourCards":
          return `${s.perCard} VP/neighbor ${s.colour}`;
        case "countNeighbourWonderStages":
          return `${s.perStage} VP/neighbor stage`;
        case "countOwnCards":
          return `${s.perCard} VP/own ${s.colours.join("+")}`;
        case "scienceWild":
          return "Science wild";
        default:
          return "Guild";
      }
    }
    default:
      return "";
  }
}

function costLabel(card: CardDef): string {
  const parts: string[] = [];
  if (card.cost.coins) parts.push(`${card.cost.coins}$`);
  if (card.cost.resources) {
    for (const [r, n] of Object.entries(card.cost.resources)) {
      parts.push(`${n}${r[0]}`);
    }
  }
  return parts.length > 0 ? parts.join(" ") : "Free";
}

export function WonderCard({
  cardId,
  selected,
  disabled,
  onSelect,
}: {
  cardId: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  const card = getCardById(cardId);
  const interactive = Boolean(onSelect) && !disabled;

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onSelect}
      className={cn(
        "flex min-w-[7.5rem] max-w-[8.5rem] flex-col rounded-md border px-2.5 py-2 text-left transition-transform",
        COLOUR_STYLES[card.colour],
        selected && "ring-2 ring-amber-300 scale-[1.03]",
        interactive && "hover:scale-[1.02] cursor-pointer",
        disabled && "opacity-50",
        !interactive && "cursor-default",
      )}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
        {card.colour} · A{card.age}
      </span>
      <span className="mt-0.5 text-sm font-bold leading-tight">
        {card.name}
      </span>
      <span className="mt-1 text-[11px] opacity-80">{effectLabel(card)}</span>
      <span className="mt-auto pt-1 text-[10px] font-semibold opacity-60">
        {costLabel(card)}
      </span>
    </button>
  );
}

export function TableauCard({ cardId }: { cardId: string }) {
  return <WonderCard cardId={cardId} />;
}

export function WonderStrip({
  wonderId,
  stagesBuilt,
}: {
  wonderId: string;
  stagesBuilt: number;
}) {
  const wonder = getWonderById(wonderId);
  return (
    <div className="rounded-md border border-amber-500/25 bg-amber-950/30 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-200/80">
        Wonder
      </p>
      <p className="text-sm font-bold text-amber-50">{wonder.name}</p>
      <p className="mt-0.5 text-xs text-amber-100/70">
        Starts with {wonder.startingResource} · Stages {stagesBuilt}/
        {wonder.stages.length}
      </p>
    </div>
  );
}
