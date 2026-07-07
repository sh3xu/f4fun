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
    <div className="flex flex-col items-center gap-2.5 transition-all bg-transparent w-full select-none">
      <div className="text-center">
        <p
          className={cn(
            "text-[10px] md:text-xs font-bold uppercase tracking-widest",
            isMyTurn ? "text-[#4fc3f7]" : "text-gray-500",
          )}
        >
          {isMyTurn ? "Your Turn" : "Waiting..."}
        </p>
        {isMyTurn && (
          <p className="text-[9px] md:text-[10px] text-gray-400 mt-0.5 font-medium">
            {phaseMessages[phase]}
          </p>
        )}
      </div>

      <DiceRoller dice={dice} />

      {dice && (
        <div className="text-center">
          <p className="text-[10px] md:text-xs text-gray-400 font-medium">
            Total:{" "}
            <span className="font-extrabold text-sm md:text-base text-white bg-[#1a2332] px-2 py-0.5 rounded border border-[#2a3a52] ml-1">
              {dice[0] + dice[1]}
            </span>
          </p>
          {isDoubles && (
            <div className="mt-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/25 font-bold text-[9px] rounded-full inline-flex items-center gap-1">
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
          className="w-[130px] md:w-[150px] font-bold py-1.5 shadow-md bg-[#2196f3] hover:bg-[#1e88e5] text-white border-0 hover:scale-[1.02] transition-transform duration-150"
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
          className="w-[130px] md:w-[150px] font-bold py-1.5 shadow-md bg-[#1a2332] hover:bg-[#243044] border border-[#2a3a52] text-gray-200 hover:scale-[1.02] transition-transform duration-150"
          aria-label="End turn"
        >
          {loading ? "Ending..." : "End Turn"}
        </Button>
      )}
    </div>
  );
}
