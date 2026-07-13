"use client";

import type {
  RoomGameStartedPayload,
  RoomPlayerJoinedPayload,
  RoomPlayerLeftPayload,
  RoomSyncedPayload,
} from "@f4fun/shared-types";
import { Copy, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PlayerBadge } from "@/components/ui/PlayerBadge";
import { cn } from "@/lib/cn";
import { loadPlayer, loadRoom, saveRoom } from "@/lib/player-storage";
import { connectSocket, emitWithCallback, getSocket } from "@/lib/socket";
import { useRoomStore } from "../store/roomStore";

function resolvePlayerAvatar(
  player: { id: string; token: string },
  myPlayerId: string | null,
  myToken: string | null,
): string {
  if (player.token) return player.token;
  if (player.id === myPlayerId && myToken) return myToken;
  const stored = loadPlayer();
  if (stored?.playerId === player.id && stored.token) return stored.token;
  return player.token;
}

export function LobbyPage() {
  const router = useRouter();
  const params = useParams();
  const codeFromUrl = (params.code as string)?.toUpperCase() ?? "";

  const {
    roomCode,
    roomId,
    players,
    myPlayerId,
    myToken,
    myPlayerSecret,
    addPlayer,
    updatePlayerConnection,
    setGameId,
    setRoom,
    setMyIdentity,
    setMyPlayerId,
  } = useRoomStore();

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const activeRoomCode = roomCode || codeFromUrl;
  const isHost = players.find((p) => p.id === myPlayerId)?.isHost ?? false;
  const canStart = players.length >= 2 && players.every((p) => p.isConnected);

  useEffect(() => {
    let cancelled = false;

    async function syncLobby() {
      const code = activeRoomCode;
      if (!code) {
        setSyncing(false);
        return;
      }

      const storedPlayer = loadPlayer();
      const storedRoom = loadRoom();
      const playerId = myPlayerId ?? storedPlayer?.playerId;
      const playerSecret = myPlayerSecret ?? storedPlayer?.playerSecret;

      if (storedPlayer && !myPlayerId) {
        setMyIdentity(
          storedPlayer.playerId,
          storedPlayer.name,
          storedPlayer.token,
          storedPlayer.playerSecret,
        );
        setMyPlayerId(storedPlayer.playerId);
      }

      try {
        connectSocket();
        const response = await emitWithCallback<RoomSyncedPayload>(
          "room:sync",
          {
            roomCode: code,
            playerId: playerId ?? undefined,
            playerSecret: playerSecret ?? undefined,
          },
        );

        if (cancelled) return;

        setRoom(response.roomId, response.roomCode, response.players);
        saveRoom({ roomId: response.roomId, roomCode: response.roomCode });

        if (storedPlayer) {
          const me = response.players.find(
            (p) => p.id === storedPlayer.playerId,
          );
          if (me) {
            setMyIdentity(me.id, me.name, me.token, storedPlayer.playerSecret);
            setMyPlayerId(me.id);
          }
        } else if (
          storedRoom?.roomId === response.roomId &&
          playerId &&
          playerSecret
        ) {
          const me = response.players.find((p) => p.id === playerId);
          if (me) {
            setMyIdentity(me.id, me.name, me.token, playerSecret);
            setMyPlayerId(me.id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setSyncing(false);
        }
      }
    }

    syncLobby();

    return () => {
      cancelled = true;
    };
  }, [
    activeRoomCode,
    myPlayerId,
    myPlayerSecret,
    setRoom,
    setMyIdentity,
    setMyPlayerId,
  ]);

  useEffect(() => {
    const socket = getSocket();

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
        roomCode: activeRoomCode,
        gameId: data.gameId,
      });
      router.push(`/game/${activeRoomCode}`);
    });

    return () => {
      socket.off("room:playerJoined");
      socket.off("room:playerLeft");
      socket.off("room:gameStarted");
    };
  }, [
    roomId,
    activeRoomCode,
    addPlayer,
    updatePlayerConnection,
    setGameId,
    router,
  ]);

  const handleStart = async () => {
    if (!activeRoomCode) return;

    setLoading(true);
    setError("");

    try {
      await emitWithCallback("room:startGame", { roomCode: activeRoomCode });
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!activeRoomCode) return;
    await navigator.clipboard.writeText(activeRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (syncing) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-gray-100 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-500 mt-4">Loading lobby...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[60%] bg-blue-500/8 rounded-full filter blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/8 rounded-full filter blur-[120px]" />
      </div>

      <header className="text-center mb-6 relative z-10">
        <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-[#4fc3f7] to-[#26c6da] bg-clip-text text-transparent tracking-tight">
          Room Lobby
        </h1>
        <p className="text-gray-500 text-xs mt-1 font-medium">
          Share the code with friends to join
        </p>
      </header>

      <Card className="w-full max-w-md relative z-10 border border-white/[0.1] bg-white/[0.05] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-gray-200">Waiting Room</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                Room Code
              </p>
              <p className="text-2xl font-black text-[#4fc3f7] font-mono tracking-widest mt-0.5">
                {activeRoomCode}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="border-white/15 text-gray-300 hover:bg-white/[0.06] hover:text-white gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Players ({players.length}/8)
            </p>
            <div className="flex flex-col gap-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={cn(
                    "p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]",
                    player.id === myPlayerId && "border-[#4fc3f7]/30",
                  )}
                >
                  <PlayerBadge
                    name={player.name}
                    avatarId={resolvePlayerAvatar(player, myPlayerId, myToken)}
                    isHost={player.isHost}
                    isOnline={player.isConnected}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-400/20 rounded-lg p-3 text-xs text-rose-300 font-semibold">
              {error}
            </div>
          )}

          {isHost && (
            <Button
              onClick={handleStart}
              disabled={!canStart || loading}
              size="lg"
              className="w-full h-12 bg-gradient-to-r from-[#2196f3] to-[#1e88e5] hover:from-[#1e88e5] hover:to-[#1976d2] text-white font-extrabold shadow-lg rounded-xl border-0"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Starting...
                </span>
              ) : (
                "Start Game"
              )}
            </Button>
          )}

          {!isHost && (
            <p className="text-sm text-center text-gray-500 font-medium">
              Waiting for host to start the game...
            </p>
          )}

          {isHost && !canStart && players.length < 2 && (
            <p className="text-xs text-center text-gray-600">
              Need at least 2 players to start
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
