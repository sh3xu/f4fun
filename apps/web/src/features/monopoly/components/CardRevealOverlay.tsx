"use client";

import { CARD_REVEAL_PAUSE_MS } from "@f4fun/monopoly-engine";
import { useEffect, useState } from "react";
import { CardFlip } from "@/components/animation/CardFlip";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { GameCard } from "@/components/ui/GameCard";
import { cn } from "@/lib/cn";

interface CardRevealOverlayProps {
  deck: "chance" | "community_chest";
  cardText: string;
  drawerName: string;
  drawerToken: string;
  drawerColorHex: string;
  canAcknowledge: boolean;
  loading?: boolean;
  onAcknowledge?: () => void;
  className?: string;
}

export function CardRevealOverlay({
  deck,
  cardText,
  drawerName,
  drawerToken,
  drawerColorHex,
  canAcknowledge,
  loading = false,
  onAcknowledge,
  className,
}: CardRevealOverlayProps) {
  const stock = deck === "community_chest" ? "community" : "chance";
  const header = deck === "chance" ? "Chance" : "Community Chest";
  const deckHint =
    deck === "chance" ? "Drew a Chance card" : "Drew a Community Chest card";

  const [revealReady, setRevealReady] = useState(false);
  const [secsLeft, setSecsLeft] = useState(
    Math.ceil(CARD_REVEAL_PAUSE_MS / 1000),
  );

  // NOTE: Parent remounts this overlay per card (`key`), so mount-only is correct.
  useEffect(() => {
    const started = Date.now();
    const tick = window.setInterval(() => {
      const left = Math.max(0, CARD_REVEAL_PAUSE_MS - (Date.now() - started));
      setSecsLeft(Math.ceil(left / 1000));
      if (left <= 0) {
        setRevealReady(true);
        window.clearInterval(tick);
      }
    }, 200);
    return () => window.clearInterval(tick);
  }, []);

  const showAck = canAcknowledge && revealReady && onAcknowledge;

  return (
    <div
      className={cn(
        "flex w-full max-w-[17rem] flex-col items-center gap-3",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-1.5">
        <Avatar
          avatarId={drawerToken}
          size="md"
          isActive
          backgroundColor={drawerColorHex}
        />
        <p className="text-center text-[length:var(--board-text-sm)] font-semibold text-slate-900">
          {drawerName}
        </p>
        <p
          className="text-center text-[length:var(--board-text-xs)] font-medium uppercase tracking-wide"
          style={{ color: drawerColorHex }}
        >
          {deckHint}
        </p>
      </div>

      <div
        className="w-full rounded-xl p-[3px]"
        style={{
          background: `linear-gradient(145deg, ${drawerColorHex}, ${drawerColorHex}55)`,
          boxShadow: `0 0 24px ${drawerColorHex}40`,
        }}
      >
        <CardFlip flipKey={cardText}>
          <GameCard stock={stock} header={header} className="text-left">
            <p className="p-3 text-center text-[length:var(--board-text-sm)] leading-snug text-slate-700">
              {cardText}
            </p>
          </GameCard>
        </CardFlip>
      </div>

      {!revealReady ? (
        <p className="text-center text-[length:var(--board-text-xs)] font-medium text-slate-500">
          Showing card… {secsLeft}s
        </p>
      ) : showAck ? (
        <Button
          variant="token"
          size="sm"
          disabled={loading}
          onClick={onAcknowledge}
          className="h-auto w-full py-1.5 text-[length:var(--board-text-sm)]"
          style={{
            borderColor: `${drawerColorHex}90`,
            boxShadow: `0 0 12px ${drawerColorHex}35`,
          }}
          aria-label="Acknowledge card"
        >
          {loading ? "..." : "Acknowledge"}
        </Button>
      ) : (
        <p className="text-center text-[length:var(--board-text-xs)] font-medium text-slate-400">
          Waiting for {drawerName}…
        </p>
      )}
    </div>
  );
}
