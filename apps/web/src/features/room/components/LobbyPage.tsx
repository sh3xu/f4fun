"use client";

import type {
  RoomGameStartedPayload,
  RoomPlayerJoinedPayload,
  RoomPlayerLeftPayload,
} from "@f4fun/shared-types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PlayerBadge } from "@/components/ui/PlayerBadge";
import { saveRoom } from "@/lib/player-storage";
import { emitWithCallback, getSocket } from "@/lib/socket";
import { useRoomStore } from "../store/roomStore";

export function LobbyPage() {
  const router = useRouter();
  const {
    roomCode,
    roomId,
    players,
    myPlayerId,
    addPlayer,
    updatePlayerConnection,
    setGameId,
  } = useRoomStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isHost = players.find((p) => p.id === myPlayerId)?.isHost ?? false;
  const canStart = players.length >= 2 && players.every((p) => p.isConnected);

  useEffect(() => {
    const socket = getSocket();

    // Ensure socket is connected
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("room:playerJoined", (data: RoomPlayerJoinedPayload) => {
      addPlayer(data.player);
    });

    socket.on("room:playerLeft", (data: RoomPlayerLeftPayload) => {
      updatePlayerConnection(data.playerId, data.isConnected);
    });

    socket.on("room:gameStarted", (data: RoomGameStartedPayload) => {
      setGameId(data.gameId);
      saveRoom({
        roomId: roomId || "",
        roomCode: roomCode || "",
        gameId: data.gameId,
      });
      router.push(`/game/${roomCode}`);
    });

    return () => {
      socket.off("room:playerJoined");
      socket.off("room:playerLeft");
      socket.off("room:gameStarted");
    };
  }, [roomId, roomCode, addPlayer, updatePlayerConnection, setGameId, router]);

  const handleStart = async () => {
    if (!roomCode) return;

    setLoading(true);
    setError("");

    try {
      await emitWithCallback("room:startGame", { roomCode });
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Room Lobby</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Room Code</p>
              <p className="text-2xl font-bold text-gray-900">{roomCode}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyCode}>
              Copy
            </Button>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Players ({players.length}/8)
            </p>
            <div className="flex flex-col gap-2">
              {players.map((player) => (
                <PlayerBadge
                  key={player.id}
                  name={player.name}
                  isHost={player.isHost}
                  isOnline={player.isConnected}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {isHost && (
            <Button
              onClick={handleStart}
              disabled={!canStart || loading}
              size="lg"
            >
              {loading ? "Starting..." : "Start Game"}
            </Button>
          )}

          {!isHost && (
            <p className="text-sm text-center text-gray-600">
              Waiting for host to start the game...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
