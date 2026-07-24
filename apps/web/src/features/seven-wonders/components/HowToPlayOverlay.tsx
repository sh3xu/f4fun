"use client";

import { OverlayPanel } from "@/components/ui/OverlayPanel";
import { GAME_TITLE } from "../constants";
import { IconLegend } from "./IconLegend";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "Simultaneous draft",
    body: "Everyone picks a card from their hand at the same time. When all picks are locked, structures rise together. Hands then pass left in Ages I and III, and right in Age II.",
  },
  {
    title: "Your three actions",
    body: "Build a card into your city, sell it to the treasury for 3 coins, or bury it under your wonder to raise the next wonder stage.",
  },
  {
    title: "Neighbor trade",
    body: "Missing resources can be bought from your west and east neighbors for coins (usually 2 each, or 1 with the matching trading post). Payment happens automatically when the turn resolves.",
  },
  {
    title: "Chains and abilities",
    body: "Some cards chain free from earlier ones. Certain wonder stages grant a free build next turn or let you raise a structure from the discard pile.",
  },
  {
    title: "How you score",
    body: "Victory points come from war tokens, leftover coins (every 3 = 1 VP), wonder stages, civic buildings, science symbols, commerce bonuses, and guild cards.",
  },
];

interface HowToPlayOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function HowToPlayOverlay({ open, onClose }: HowToPlayOverlayProps) {
  return (
    <OverlayPanel open={open} onClose={onClose} title="How to play" size="lg">
      <p className="mb-4 text-sm text-amber-100/70">
        A quick overview of {GAME_TITLE} — enough to sit down and draft.
      </p>
      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h3 className="mb-1 text-[11px] font-black uppercase tracking-[0.22em] text-amber-300/80">
              {section.title}
            </h3>
            <p className="text-sm leading-relaxed text-amber-50/85">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <div className="my-6 border-t border-white/10" />

      <h3 className="mb-1 text-[11px] font-black uppercase tracking-[0.22em] text-amber-300/80">
        Icon guide
      </h3>
      <p className="mb-4 text-sm leading-relaxed text-amber-50/85">
        Every symbol on cards, seats, and wonders — what it is and what it does.
      </p>
      <IconLegend />
    </OverlayPanel>
  );
}

export const HOW_TO_PLAY_SEEN_KEY = "empires-dawn-howto-seen";
