"use client";

import type { GameState } from "@f4fun/monopoly-engine";
import { useRouter } from "next/navigation";
import { Confetti } from "@/components/animation/Confetti";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Confetti />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {isMe ? "🎉 You Won!" : `🏆 ${winner.name} Wins!`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <div className="text-6xl mb-2">{winner.token}</div>
            <p className="text-2xl font-bold text-gray-900">{winner.name}</p>
            <p className="text-lg text-green-600 font-semibold">
              ${winner.cash}
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Final Standings
            </h3>
            <div className="space-y-2">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 rounded bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-semibold w-6">
                      #{index + 1}
                    </span>
                    <span className="text-xl">{player.token}</span>
                    <span className="font-medium">{player.name}</span>
                    {player.isBankrupt && (
                      <span className="text-xs text-red-600 font-semibold">
                        Bankrupt
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-gray-900">
                    ${player.cash}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="flex-1"
            >
              Leave Room
            </Button>
            <Button onClick={() => window.location.reload()} className="flex-1">
              New Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
