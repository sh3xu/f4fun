"use client";

import type {
  GameType,
  RoomAddBotPlayerResponsePayload,
  RoomGameStartedPayload,
  RoomGameTypeUpdatedPayload,
  RoomPlayerJoinedPayload,
  RoomPlayerLeftPayload,
  RoomSyncedPayload,
} from "@f4fun/shared-types";
import { Bot, Copy, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { GameCard } from "@/components/ui/GameCard";
import { GameLoader } from "@/components/ui/GameLoader";
import { PlayerBadge } from "@/components/ui/PlayerBadge";
import { TableShell } from "@/components/ui/TableShell";
import { cn } from "@/lib/cn";
import { loadPlayer, loadRoom, saveRoom } from "@/lib/player-storage";
import { connectSocket, emitWithCallback, getSocket } from "@/lib/socket";
import { useRoomStore } from "../store/roomStore";
import {
  DEFAULT_HOST_GAME_OPTIONS,
  HostGameOptions,
  type HostGameOptionsValue,
} from "./HostGameOptions";

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
    gameType,
    addPlayer,
    updatePlayerConnection,
    setGameId,
    setGameType,
    setRoom,
    setMyIdentity,
    setMyPlayerId,
  } = useRoomStore();

  const [loading, setLoading] = useState(false);
  const [addingBot, setAddingBot] = useState(false);
  const [settingGameType, setSettingGameType] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [hostOptions, setHostOptions] = useState<HostGameOptionsValue>(
    DEFAULT_HOST_GAME_OPTIONS,
  );

  const activeRoomCode = roomCode || codeFromUrl;
  const isHost = players.find((p) => p.id === myPlayerId)?.isHost ?? false;
  const connectedCount = players.filter((p) => p.isConnected || p.isBot).length;
  const canStartMonopoly =
    players.length >= 2 && players.every((p) => p.isConnected || p.isBot);
  // NOTE: Match server seatedPlayers filter — disconnected seats are excluded, not blockers.
  const canStartSevenWonders = connectedCount >= 3 && connectedCount <= 7;
  const canStart =
    gameType === "sevenWonders" ? canStartSevenWonders : canStartMonopoly;
  const lobbyActionPending = addingBot || loading || settingGameType;

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

        setRoom(
          response.roomId,
          response.roomCode,
          response.players,
          response.gameType,
        );
        saveRoom({
          roomId: response.roomId,
          roomCode: response.roomCode,
          gameType: response.gameType,
        });

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

    socket.on("room:gameTypeUpdated", (data: RoomGameTypeUpdatedPayload) => {
      setGameType(data.gameType);
    });

    socket.on("room:gameStarted", (data: RoomGameStartedPayload) => {
      setGameId(data.gameId);
      setGameType(data.gameType);
      saveRoom({
        roomId: roomId || "",
        roomCode: activeRoomCode,
        gameId: data.gameId,
        gameType: data.gameType,
      });
      router.push(`/game/${activeRoomCode}`);
    });

    return () => {
      socket.off("room:playerJoined");
      socket.off("room:playerLeft");
      socket.off("room:gameTypeUpdated");
      socket.off("room:gameStarted");
    };
  }, [
    roomId,
    activeRoomCode,
    addPlayer,
    updatePlayerConnection,
    setGameId,
    setGameType,
    router,
  ]);

  const handleSetGameType = async (next: GameType) => {
    if (!activeRoomCode || lobbyActionPending || next === gameType) return;

    setSettingGameType(true);
    setError("");

    try {
      await emitWithCallback("room:setGameType", {
        roomCode: activeRoomCode,
        gameType: next,
      });
      setGameType(next);
      saveRoom({
        roomId: roomId || "",
        roomCode: activeRoomCode,
        gameType: next,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSettingGameType(false);
    }
  };

  const handleAddBot = async () => {
    if (!activeRoomCode || lobbyActionPending) return;

    setAddingBot(true);
    setError("");

    try {
      const response = await emitWithCallback<RoomAddBotPlayerResponsePayload>(
        "room:addBotPlayer",
        { roomCode: activeRoomCode },
      );
      if (response?.players) {
        setRoom(roomId || "", activeRoomCode, response.players, gameType);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAddingBot(false);
    }
  };

  const handleStart = async () => {
    if (!activeRoomCode || lobbyActionPending) return;

    setLoading(true);
    setError("");

    try {
      await emitWithCallback("room:startGame", {
        roomCode: activeRoomCode,
        options: hostOptions,
      });
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
      <div className="material-felt flex min-h-dvh flex-col items-center justify-center text-slate-800">
        <div className="relative z-[2] flex flex-col items-center">
          <GameLoader size="lg" label="Loading lobby" />
          <p className="mt-4 text-sm text-slate-500">
            Pulling up chairs at the table...
          </p>
        </div>
      </div>
    );
  }

  return (
    <TableShell
      title="Room lobby"
      subtitle="Share the code — seats fill as friends arrive"
    >
      <GameCard stock="property" dealIn className="w-full p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
                Room code
              </p>
              <p className="mt-0.5 font-mono text-2xl font-black tracking-widest text-teal-700">
                {activeRoomCode}
              </p>
            </div>
            <Button
              variant="tokenGhost"
              size="sm"
              onClick={handleCopyCode}
              className="min-h-11 gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          {isHost ? (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                Game
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={lobbyActionPending}
                  onClick={() => handleSetGameType("monopoly")}
                  className={cn(
                    "rounded-md border px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                    gameType === "monopoly"
                      ? "border-[#4fc3f7]/50 bg-[#4fc3f7]/15 text-[#4fc3f7]"
                      : "border-white/10 bg-black/20 text-gray-300 hover:border-white/20",
                  )}
                >
                  Monopoly
                </button>
                <button
                  type="button"
                  disabled={lobbyActionPending}
                  onClick={() => handleSetGameType("sevenWonders")}
                  className={cn(
                    "rounded-md border px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                    gameType === "sevenWonders"
                      ? "border-amber-400/50 bg-amber-500/15 text-amber-200"
                      : "border-white/10 bg-black/20 text-gray-300 hover:border-white/20",
                  )}
                >
                  7 Wonders
                </button>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-400">
              Playing{" "}
              <span className="font-semibold text-gray-200">
                {gameType === "sevenWonders" ? "7 Wonders" : "Monopoly"}
              </span>
            </p>
          )}

          <div>
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold tracking-widest text-slate-500 uppercase">
              <Users className="h-3.5 w-3.5" />
              Seats ({players.length}/8)
            </p>
            {players.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                Pull up a chair — no one&apos;s here yet
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className={cn(
                      "animate-token-settle rounded-xl border border-slate-200 bg-white p-2.5",
                      player.id === myPlayerId &&
                        "border-teal-400 bg-teal-50/60",
                    )}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <PlayerBadge
                      name={player.name}
                      avatarId={resolvePlayerAvatar(
                        player,
                        myPlayerId,
                        myToken,
                      )}
                      isHost={player.isHost}
                      isBot={player.isBot}
                      isOnline={player.isConnected}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {isHost && gameType === "monopoly" && players.length < 8 && (
            <Button
              variant="tokenGhost"
              onClick={handleAddBot}
              disabled={lobbyActionPending}
              className="h-11 w-full gap-2 font-bold"
            >
              <Bot className="h-4 w-4" />
              {addingBot ? "Adding AI..." : "Add AI Player"}
            </Button>
          )}

          {isHost && (
            <HostGameOptions
              value={hostOptions}
              onChange={setHostOptions}
              disabled={lobbyActionPending}
            />
          )}

          {isHost && (
            <Button
              variant="token"
              onClick={handleStart}
              disabled={!canStart || lobbyActionPending}
              size="lg"
              className="h-12 w-full font-extrabold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <GameLoader size="sm" />
                  Starting...
                </span>
              ) : (
                "Start game"
              )}
            </Button>
          )}

          {!isHost && (
            <p className="text-center text-sm font-medium text-slate-500">
              Waiting for the host to start the game...
            </p>
          )}

          {isHost &&
            gameType === "monopoly" &&
            !canStart &&
            players.length < 2 && (
              <p className="text-center text-xs text-slate-500">
                Need at least 2 players at the table to start
              </p>
            )}

          {isHost && gameType === "sevenWonders" && !canStart && (
            <p className="text-center text-xs text-slate-500">
              Seven Wonders needs 3–7 connected players
            </p>
          )}
        </div>
      </GameCard>
    </TableShell>
  );
}
