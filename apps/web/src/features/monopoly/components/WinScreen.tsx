"use client";

import type { GameState } from "@f4fun/monopoly-engine";
import { useRouter } from "next/navigation";
import { Confetti } from "@/components/animation/Confetti";
import { Button } from "@/components/ui/Button";
import { GameCard } from "@/components/ui/GameCard";

interface WinScreenProps {
  gameState: GameState;
  winnerId: string;
  myPlayerId?: string | null;
}

export function WinScreen({ gameState, winnerId, myPlayerId }: WinScreenProps) {
  const router = useRouter();
  const winner = gameState.players[winnerId];
  const isMe = winnerId === myPlayerId;

  const sortedPlayers = Object.values(gameState.players).sort(
    (a, b) => b.cash - a.cash,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <Confetti />
      <GameCard
        stock="buyPrompt"
        header={isMe ? "You won the table" : `${winner.name} takes the win`}
        className="w-full max-w-md animate-card-deal"
      >
        <div className="space-y-4 p-5">
          <div className="py-2 text-center">
            <div className="mb-2 text-5xl">{winner.token}</div>
            <p className="text-2xl font-bold text-slate-900">{winner.name}</p>
            <p className="text-lg font-semibold text-emerald-600">
              ${winner.cash}
            </p>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-2 font-semibold text-slate-700">
              Final standings
            </h3>
            <div className="space-y-2">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 font-semibold text-slate-400">
                      #{index + 1}
                    </span>
                    <span className="text-xl">{player.token}</span>
                    <span className="font-medium text-slate-800">
                      {player.name}
                    </span>
                    {player.isBankrupt && (
                      <span className="text-xs font-semibold text-rose-400">
                        Bankrupt
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-slate-900">
                    ${player.cash}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => router.push("/")}
              variant="tokenGhost"
              className="flex-1"
            >
              Leave Room
            </Button>
            <Button
              variant="token"
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Play again
            </Button>
          </div>
        </div>
      </GameCard>
    </div>
  );
}
