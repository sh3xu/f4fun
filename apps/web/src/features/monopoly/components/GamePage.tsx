"use client";

import type { GameEvent, GameState } from "@f4fun/monopoly-engine";
import { TILE_BY_POSITION } from "@f4fun/monopoly-engine";
import { useCallback, useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useRoomStore } from "@/features/room/store/roomStore";
import { cn } from "@/lib/cn";
import { emitWithCallback, getSocket } from "@/lib/socket";
import { useGameStore } from "../store/gameStore";
import { GLASS_PANEL } from "../theme/board-theme";
import { Board } from "./Board";
import { PlayerHUD } from "./PlayerHUD";
import { WinScreen } from "./WinScreen";

const SESSION_KEY = "monopoly_session";

interface SessionData {
  roomId: string;
  roomCode: string;
  playerId: string;
  playerName: string;
  timestamp: number;
}

export function GamePage() {
  const { roomId, roomCode, myPlayerId, setRoomId, setMyPlayerId } =
    useRoomStore();
  const { state, setFromSnapshot, applyServerUpdate } = useGameStore();
  const [initializing, setInitializing] = useState(true);
  const [winnerId, setWinnerId] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId && typeof window !== "undefined") {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const session: SessionData = JSON.parse(stored);
          const age = Date.now() - session.timestamp;

          if (age < 1000 * 60 * 60) {
            console.log("[GamePage] Restoring session from storage:", {
              roomId: session.roomId,
              playerId: session.playerId,
            });
            setRoomId(session.roomId);
            setMyPlayerId(session.playerId);

            const socket = getSocket();
            if (!socket.connected) {
              console.log("[GamePage] Socket not connected, connecting...");
              socket.connect();
            }
            console.log("[GamePage] Emitting game:rejoin");
            socket.emit("game:rejoin", {
              roomId: session.roomId,
              playerId: session.playerId,
            });
            setInitializing(true);
            return;
          }
          localStorage.removeItem(SESSION_KEY);
        } catch {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    }

    if (roomId && myPlayerId && roomCode) {
      const session: SessionData = {
        roomId,
        roomCode,
        playerId: myPlayerId,
        playerName: state?.players[myPlayerId]?.name || "",
        timestamp: Date.now(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }, [roomId, roomCode, myPlayerId, state, setRoomId, setMyPlayerId]);

  const handleEvent = useCallback(
    (event: GameEvent) => {
      switch (event.type) {
        case "PROPERTY_BOUGHT": {
          const playerName = state?.players[event.playerId]?.name || "Player";
          const tile = TILE_BY_POSITION.get(event.position);
          const propertyName = tile?.name || `Position ${event.position}`;
          toast.success(`${playerName} bought ${propertyName}`, {
            duration: 3000,
          });
          break;
        }
        case "RENT_PAID": {
          const payerName = state?.players[event.payerId]?.name || "Player";
          const ownerName = state?.players[event.ownerId]?.name || "Owner";
          toast.info(
            `${payerName} paid $${event.amount} rent to ${ownerName}`,
            {
              duration: 3000,
            },
          );
          break;
        }
        case "PLAYER_BANKRUPT": {
          const playerName = state?.players[event.playerId]?.name || "Player";
          toast.error(`💀 ${playerName} went bankrupt!`, { duration: 4000 });
          break;
        }
        case "GAME_WON": {
          const winnerName = state?.players[event.winnerId]?.name || "Winner";
          setWinnerId(event.winnerId);
          toast.success(`🎉 ${winnerName} won the game!`, { duration: 5000 });
          break;
        }
        case "PASSED_GO": {
          const playerName = state?.players[event.playerId]?.name || "Player";
          toast.success(`${playerName} passed GO! +$200`, { duration: 2000 });
          break;
        }
      }
    },
    [state],
  );

  useEffect(() => {
    if (!roomId || !myPlayerId) return;

    const socket = getSocket();

    console.log(
      "[GamePage] Socket listeners effect running, socket.connected:",
      socket.connected,
    );

    let cleanupListeners: (() => void) | null = null;
    let waitForConnection: NodeJS.Timeout | null = null;

    function setupListeners() {
      console.log("[GamePage] Setting up listeners now");

      const handleStateSnapshot = (data: { state: GameState }) => {
        console.log("[GamePage] ✓ Received game:stateSnapshot");
        if (data?.state) {
          console.log("[GamePage] Setting game state from snapshot");
          setFromSnapshot(data.state);
          setInitializing(false);
        }
      };

      const handleStateUpdated = (data: {
        state: GameState;
        events: GameEvent[];
      }) => {
        console.log("[GamePage] ✓ Received game:stateUpdated");
        applyServerUpdate(data.state, data.events);
        for (const event of data.events) {
          handleEvent(event);
        }
      };

      socket.on("game:stateSnapshot", handleStateSnapshot);
      socket.on("game:stateUpdated", handleStateUpdated);

      // Explicitly request current game snapshot and join room
      console.log(
        "[GamePage] Emitting game:rejoin for roomId:",
        roomId,
        "playerId:",
        myPlayerId,
      );
      socket.emit("game:rejoin", { roomId, playerId: myPlayerId });

      // Fallback timeout
      const timeout = setTimeout(() => {
        console.warn(
          "[GamePage] ⏱ Timeout - no snapshot after 5s, stopping initialization",
        );
        setInitializing(false);
      }, 5000);

      cleanupListeners = () => {
        clearTimeout(timeout);
        socket.off("game:stateSnapshot", handleStateSnapshot);
        socket.off("game:stateUpdated", handleStateUpdated);
      };
    }

    // Ensure socket is connected before setting up listeners
    if (!socket.connected) {
      console.log("[GamePage] Connecting socket...");
      socket.connect();
      // Wait a bit for connection before registering listeners
      waitForConnection = setTimeout(() => {
        setupListeners();
      }, 100);
    } else {
      setupListeners();
    }

    return () => {
      if (waitForConnection) clearTimeout(waitForConnection);
      if (cleanupListeners) {
        cleanupListeners();
      }
    };
  }, [roomId, myPlayerId, setFromSnapshot, applyServerUpdate, handleEvent]);

  const handleRoll = async () => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:rollDice", { roomId });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleBuy = async () => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:buyProperty", { roomId });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDecline = async () => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:declineProperty", { roomId });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleEndTurn = async () => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:endTurn", { roomId });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (initializing || !state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b0f17] text-gray-100">
        <LoadingSpinner size="lg" />
        <p className="text-xl text-gray-200 mt-4 font-bold tracking-wide">
          Loading f4fun...
        </p>
        <p className="text-sm text-gray-500 mt-2">Connecting to game room</p>
      </div>
    );
  }

  const activePlayerId = state.turnOrder[state.activePlayerIndex];

  return (
    <div className="min-h-screen overflow-y-auto lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-[#0b0f17] text-gray-100 p-2.5 md:p-3 lg:p-4 gap-3 font-sans select-none">
      <Toaster position="top-center" richColors />

      {winnerId && (
        <WinScreen
          gameState={state}
          winnerId={winnerId}
          myPlayerId={myPlayerId}
        />
      )}

      <main className="flex-grow min-h-0 flex items-center justify-center p-1 order-1">
        <Board
          onRoll={handleRoll}
          onBuy={handleBuy}
          onDecline={handleDecline}
          onEndTurn={handleEndTurn}
        />
      </main>

      <aside
        className={cn(
          "shrink-0 lg:w-52 w-full flex flex-col gap-2.5 p-3 rounded-xl overflow-y-auto lg:h-full max-h-[200px] lg:max-h-none order-2",
          GLASS_PANEL,
        )}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 px-0.5">
          <span className="font-black text-base tracking-widest bg-gradient-to-r from-[#4fc3f7] to-[#26c6da] bg-clip-text text-transparent">
            f4fun
          </span>
          {roomCode && (
            <div className="text-[9px] md:text-[10px] text-gray-500 font-medium bg-[#1a2332] px-1.5 py-0.5 rounded border border-[#2a3a52]">
              <span className="font-mono font-bold text-[#4fc3f7]">
                {roomCode}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible w-full">
          {state.turnOrder.map((playerId) => (
            <div
              key={playerId}
              className="min-w-[140px] lg:min-w-0 w-full shrink-0"
            >
              <PlayerHUD
                player={state.players[playerId]}
                isActive={playerId === activePlayerId}
                isMe={playerId === myPlayerId}
                turnOrder={state.turnOrder}
              />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
