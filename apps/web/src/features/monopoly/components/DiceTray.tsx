"use client";

import type { GamePhase } from "@f4fun/monopoly-engine";
import { DiceRoller } from "@/components/animation/DiceRoller";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface DiceTrayProps {
  dice: [number, number] | null;
  isMyTurn: boolean;
  phase: GamePhase;
  onRoll: () => void;
  onEndTurn: () => void;
  loading: boolean;
}

const phaseMessages: Record<GamePhase, string> = {
  WAITING: "Waiting for game to start",
  PRE_ROLL: "Roll the dice to move",
  JAIL_DECISION: "Choose how to get out of jail",
  POST_ROLL: "Moving...",
  BUY_OR_DECLINE: "Buy or decline property",
  CARD_DRAWN: "Card drawn",
  POST_BUY: "Processing...",
  END_TURN: "End your turn",
  GAME_OVER: "Game Over",
};

export function DiceTray({
  dice,
  isMyTurn,
  phase,
  onRoll,
  onEndTurn,
  loading,
}: DiceTrayProps) {
  const isDoubles = dice && dice[0] === dice[1];

  return (
    <div className="flex w-full select-none flex-col items-center gap-[clamp(0.35rem,1.4cqmin,0.65rem)] bg-transparent transition-all">
      <div className="text-center">
        <p
          className={cn(
            "font-bold uppercase tracking-widest",
            "text-[clamp(8px,1.8cqmin,12px)]",
            isMyTurn ? "text-[#4fc3f7]" : "text-gray-500",
          )}
        >
          {isMyTurn ? "Your Turn" : "Waiting..."}
        </p>
        {isMyTurn && (
          <p className="mt-0.5 text-[clamp(7px,1.5cqmin,10px)] font-medium text-gray-400">
            {phaseMessages[phase]}
          </p>
        )}
      </div>

      <DiceRoller dice={dice} />

      {dice && (
        <div className="text-center">
          <p className="text-[clamp(8px,1.6cqmin,12px)] font-medium text-gray-400">
            Total:{" "}
            <span className="ml-1 rounded border border-[#2a3a52] bg-[#1a2332] px-[0.4em] py-[0.1em] text-[clamp(10px,2cqmin,14px)] font-extrabold text-white">
              {dice[0] + dice[1]}
            </span>
          </p>
          {isDoubles && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-yellow-500/25 bg-yellow-500/10 px-2 py-0.5 text-[clamp(7px,1.4cqmin,9px)] font-bold text-yellow-400">
              Doubles!
            </div>
          )}
        </div>
      )}

      {isMyTurn && phase === "PRE_ROLL" && (
        <Button
          onClick={onRoll}
          disabled={loading}
          size="sm"
          className="h-auto w-[clamp(6.5rem,22cqmin,9.5rem)] border-0 bg-[#2196f3] py-[clamp(0.3rem,1cqmin,0.45rem)] text-[clamp(10px,1.8cqmin,13px)] font-bold text-white shadow-md transition-transform duration-150 hover:scale-[1.02] hover:bg-[#1e88e5]"
          aria-label="Roll dice"
        >
          {loading ? "Rolling..." : "Roll Dice"}
        </Button>
      )}

      {isMyTurn && phase === "END_TURN" && (
        <Button
          onClick={onEndTurn}
          disabled={loading}
          variant="secondary"
          size="sm"
          className="h-auto w-[clamp(6.5rem,22cqmin,9.5rem)] border border-[#2a3a52] bg-[#1a2332] py-[clamp(0.3rem,1cqmin,0.45rem)] text-[clamp(10px,1.8cqmin,13px)] font-bold text-gray-200 shadow-md transition-transform duration-150 hover:scale-[1.02] hover:bg-[#243044]"
          aria-label="End turn"
        >
          {loading ? "Ending..." : "End Turn"}
        </Button>
      )}
    </div>
  );
}
