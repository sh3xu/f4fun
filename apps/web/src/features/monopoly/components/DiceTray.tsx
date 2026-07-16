"use client";

import type { GamePhase } from "@f4fun/monopoly-engine";
import { JAIL_FINE } from "@f4fun/monopoly-engine";
import { DiceRoller } from "@/components/animation/DiceRoller";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface DiceTrayProps {
  dice: [number, number] | null;
  isMyTurn: boolean;
  phase: GamePhase;
  onRoll: () => void;
  onEndTurn: () => void;
  onPayJailFine?: () => void;
  onUseGoojfCard?: () => void;
  onRollForJail?: () => void;
  onAcknowledgeCard?: () => void;
  pendingCardText?: string | null;
  goojfCards?: number;
  cash?: number;
  loading: boolean;
  isDiceAnimating?: boolean;
  awaitingRoll?: boolean;
  rollKey?: number;
  onDiceAnimationComplete?: () => void;
}

const phaseMessages: Record<GamePhase, string> = {
  WAITING: "Waiting for game to start",
  PRE_ROLL: "Roll the dice to move",
  JAIL_DECISION: "Choose how to get out of jail",
  POST_ROLL: "Moving...",
  BUY_OR_DECLINE: "Buy, skip, or auction",
  CARD_DRAWN: "Card drawn",
  POST_BUY: "Processing...",
  AUCTION: "Auction in progress",
  RAISE_CASH: "Raise cash to cover debt",
  END_TURN: "End your turn or manage properties",
  GAME_OVER: "Game Over",
};

export function DiceTray({
  dice,
  isMyTurn,
  phase,
  onRoll,
  onEndTurn,
  onPayJailFine,
  onUseGoojfCard,
  onRollForJail,
  onAcknowledgeCard,
  pendingCardText = null,
  goojfCards = 0,
  cash = 0,
  loading,
  isDiceAnimating = false,
  awaitingRoll = false,
  rollKey = 0,
  onDiceAnimationComplete,
}: DiceTrayProps) {
  const isDoubles = dice && dice[0] === dice[1];
  const phaseHint = isDiceAnimating
    ? "Rolling..."
    : awaitingRoll
      ? "Moving..."
      : phaseMessages[phase];
  const canPayFine = cash >= JAIL_FINE;
  const canUseCard = goojfCards > 0;

  return (
    <div className="flex w-full select-none flex-col items-center gap-[clamp(0.35rem,1.4cqmin,0.65rem)] bg-transparent transition-all">
      <div className="text-center">
        <p
          className={cn(
            "font-bold uppercase tracking-widest",
            "text-[length:var(--board-text)]",
            isMyTurn ? "text-[#4fc3f7]" : "text-gray-500",
          )}
        >
          {isMyTurn ? "Your Turn" : "Waiting..."}
        </p>
        {isMyTurn && (
          <p className="mt-0.5 text-[length:var(--board-text-sm)] font-medium text-gray-400">
            {phaseHint}
          </p>
        )}
      </div>

      <DiceRoller
        dice={dice}
        animate={isDiceAnimating}
        rollKey={rollKey}
        onComplete={onDiceAnimationComplete}
      />

      {dice && !isDiceAnimating && isDoubles && (
        <div className="inline-flex items-center gap-1 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 text-[length:var(--board-text-xs)] font-bold text-yellow-400">
          Doubles!
        </div>
      )}

      {isMyTurn && phase === "PRE_ROLL" && (
        <Button
          onClick={onRoll}
          disabled={loading}
          size="sm"
          className="h-auto w-[clamp(7rem,24cqmin,12rem)] border-0 bg-[#2196f3] py-[clamp(0.35rem,1.2cqmin,0.65rem)] text-[length:var(--board-text-sm)] font-bold text-white shadow-md transition-transform duration-150 hover:scale-[1.02] hover:bg-[#1e88e5]"
          aria-label="Roll dice"
        >
          {loading ? "Rolling..." : "Roll Dice"}
        </Button>
      )}

      {isMyTurn && phase === "JAIL_DECISION" && (
        <div className="flex w-full max-w-[14rem] flex-col gap-1.5">
          <Button
            onClick={onRollForJail}
            disabled={loading || !onRollForJail}
            size="sm"
            className="h-auto w-full border-0 bg-[#2196f3] py-[clamp(0.35rem,1.2cqmin,0.65rem)] text-[length:var(--board-text-sm)] font-bold text-white shadow-md transition-transform duration-150 hover:scale-[1.02] hover:bg-[#1e88e5]"
            aria-label="Roll for doubles to leave jail"
          >
            {loading ? "Rolling..." : "Roll for Doubles"}
          </Button>
          <Button
            onClick={onPayJailFine}
            disabled={loading || !canPayFine || !onPayJailFine}
            variant="secondary"
            size="sm"
            className="h-auto w-full border border-[#2a3a52] bg-[#1a2332] py-[clamp(0.35rem,1.2cqmin,0.65rem)] text-[length:var(--board-text-sm)] font-bold text-gray-200 shadow-md transition-transform duration-150 hover:scale-[1.02] hover:bg-[#243044] disabled:opacity-40"
            aria-label={`Pay $${JAIL_FINE} jail fine`}
          >
            Pay ${JAIL_FINE}
          </Button>
          <Button
            onClick={onUseGoojfCard}
            disabled={loading || !canUseCard || !onUseGoojfCard}
            variant="secondary"
            size="sm"
            className="h-auto w-full border border-[#2a3a52] bg-[#1a2332] py-[clamp(0.35rem,1.2cqmin,0.65rem)] text-[length:var(--board-text-sm)] font-bold text-gray-200 shadow-md transition-transform duration-150 hover:scale-[1.02] hover:bg-[#243044] disabled:opacity-40"
            aria-label="Use Get Out of Jail Free card"
          >
            Use Jail Free Card
          </Button>
        </div>
      )}

      {isMyTurn && phase === "CARD_DRAWN" && (
        <div className="flex w-full max-w-[14rem] flex-col gap-1.5">
          {pendingCardText && (
            <p className="text-center text-[length:var(--board-text-sm)] leading-snug text-gray-300">
              {pendingCardText}
            </p>
          )}
          <Button
            onClick={onAcknowledgeCard}
            disabled={loading || !onAcknowledgeCard}
            size="sm"
            className="h-auto w-full border-0 bg-[#2196f3] py-[clamp(0.35rem,1.2cqmin,0.65rem)] text-[length:var(--board-text-sm)] font-bold text-white shadow-md transition-transform duration-150 hover:scale-[1.02] hover:bg-[#1e88e5]"
            aria-label="Acknowledge drawn card"
          >
            {loading ? "Applying..." : "OK"}
          </Button>
        </div>
      )}

      {isMyTurn && phase === "END_TURN" && (
        <Button
          onClick={onEndTurn}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="h-auto w-[clamp(7rem,24cqmin,12rem)] border border-[#2a3a52] bg-[#1a2332] py-[clamp(0.35rem,1.2cqmin,0.65rem)] text-[length:var(--board-text-sm)] font-bold text-gray-200 shadow-md transition-transform duration-150 hover:scale-[1.02] hover:bg-[#243044]"
          aria-label="End turn"
        >
          {loading ? "Ending..." : "End Turn"}
        </Button>
      )}
    </div>
  );
}
