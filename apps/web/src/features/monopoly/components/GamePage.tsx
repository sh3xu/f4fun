"use client";

import type { GameEvent, GameState, TradeOffer } from "@f4fun/monopoly-engine";
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
import { PropertyManagePanel } from "./PropertyManagePanel";
import { TradeModal } from "./TradeModal";
import { WinScreen } from "./WinScreen";

const SESSION_KEY = "monopoly_session";

interface SessionData {
  roomId: string;
  roomCode: string;
  playerId: string;
  playerSecret: string;
  playerName: string;
  timestamp: number;
}

export function GamePage() {
  const {
    roomId,
    roomCode,
    myPlayerId,
    myPlayerSecret,
    setRoomId,
    setMyPlayerId,
    setMyPlayerSecret,
  } = useRoomStore();
  const { state, setFromSnapshot, applyServerUpdate, startDiceRoll } =
    useGameStore();
  const [initializing, setInitializing] = useState(true);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [tradeOpen, setTradeOpen] = useState(false);

  useEffect(() => {
    if (!roomId && typeof window !== "undefined") {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const session: SessionData = JSON.parse(stored);
          const age = Date.now() - session.timestamp;

          if (age < 1000 * 60 * 60 && session.playerSecret) {
            console.log("[GamePage] Restoring session from storage:", {
              roomId: session.roomId,
              playerId: session.playerId,
            });
            setRoomId(session.roomId);
            setMyPlayerId(session.playerId);
            setMyPlayerSecret(session.playerSecret);

            const socket = getSocket();
            if (!socket.connected) {
              console.log("[GamePage] Socket not connected, connecting...");
              socket.connect();
            }
            console.log("[GamePage] Emitting game:rejoin");
            socket.emit("game:rejoin", {
              roomId: session.roomId,
              playerId: session.playerId,
              playerSecret: session.playerSecret,
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

    if (roomId && myPlayerId && myPlayerSecret && roomCode) {
      const session: SessionData = {
        roomId,
        roomCode,
        playerId: myPlayerId,
        playerSecret: myPlayerSecret,
        playerName: state?.players[myPlayerId]?.name || "",
        timestamp: Date.now(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }, [
    roomId,
    roomCode,
    myPlayerId,
    myPlayerSecret,
    state,
    setRoomId,
    setMyPlayerId,
    setMyPlayerSecret,
  ]);

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
        case "AUCTION_STARTED": {
          const tile = TILE_BY_POSITION.get(event.position);
          toast.info(`Auction started: ${tile?.name ?? event.position}`, {
            duration: 2500,
          });
          break;
        }
        case "AUCTION_WON": {
          const playerName = state?.players[event.playerId]?.name || "Player";
          const tile = TILE_BY_POSITION.get(event.position);
          toast.success(
            `${playerName} won ${tile?.name ?? event.position} for $${event.amount}`,
            { duration: 3000 },
          );
          break;
        }
        case "AUCTION_CANCELLED": {
          toast.info("Auction cancelled — no bids", { duration: 2500 });
          break;
        }
        case "TRADE_COMPLETED": {
          toast.success("Trade completed", { duration: 2500 });
          break;
        }
        case "TRADE_PROPOSED": {
          if (event.toPlayerId === myPlayerId) {
            toast.info("You received a trade offer", { duration: 3000 });
          }
          break;
        }
        case "HOUSE_BUILT":
        case "HOTEL_BUILT": {
          toast.success("Building constructed", { duration: 2000 });
          break;
        }
        case "PROPERTY_MORTGAGED": {
          toast.info("Property mortgaged", { duration: 2000 });
          break;
        }
        case "PLAYER_BANKRUPT": {
          const playerName = state?.players[event.playerId]?.name || "Player";
          toast.error(`${playerName} went bankrupt!`, { duration: 4000 });
          break;
        }
        case "GAME_WON": {
          const winnerName = state?.players[event.winnerId]?.name || "Winner";
          setWinnerId(event.winnerId);
          toast.success(`${winnerName} won the game!`, { duration: 5000 });
          break;
        }
        case "PASSED_GO": {
          const playerName = state?.players[event.playerId]?.name || "Player";
          toast.success(`${playerName} passed GO! +$200`, { duration: 2000 });
          break;
        }
      }
    },
    [state, myPlayerId],
  );

  useEffect(() => {
    if (!roomId || !myPlayerId || !myPlayerSecret) return;

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
        console.log("[GamePage] Received game:stateSnapshot");
        if (data?.state) {
          setFromSnapshot(data.state);
          setInitializing(false);
        }
      };

      const handleStateUpdated = (data: {
        state: GameState;
        events: GameEvent[];
      }) => {
        console.log("[GamePage] Received game:stateUpdated");
        applyServerUpdate(data.state, data.events);
        for (const event of data.events) {
          handleEvent(event);
        }
      };

      socket.on("game:stateSnapshot", handleStateSnapshot);
      socket.on("game:stateUpdated", handleStateUpdated);

      socket.emit("game:rejoin", {
        roomId,
        playerId: myPlayerId,
        playerSecret: myPlayerSecret,
      });

      const timeout = setTimeout(() => {
        console.warn(
          "[GamePage] Timeout - no snapshot after 5s, stopping initialization",
        );
        setInitializing(false);
      }, 5000);

      cleanupListeners = () => {
        clearTimeout(timeout);
        socket.off("game:stateSnapshot", handleStateSnapshot);
        socket.off("game:stateUpdated", handleStateUpdated);
      };
    }

    if (!socket.connected) {
      console.log("[GamePage] Connecting socket...");
      socket.connect();
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
  }, [
    roomId,
    myPlayerId,
    myPlayerSecret,
    setFromSnapshot,
    applyServerUpdate,
    handleEvent,
  ]);

  const handleRoll = async () => {
    if (!roomId) return;
    startDiceRoll();
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

  const handleAuction = async () => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:startAuction", { roomId });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handlePlaceBid = async (amount: number) => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:placeBid", { roomId, amount });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handlePassAuction = async () => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:passAuction", { roomId });
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

  const handleBuildHouse = async (position: number) => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:buildHouse", { roomId, position });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleSellHouse = async (position: number) => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:sellHouse", { roomId, position });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleBuildHotel = async (position: number) => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:buildHotel", { roomId, position });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleSellHotel = async (position: number) => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:sellHotel", { roomId, position });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleMortgage = async (position: number) => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:mortgageProperty", { roomId, position });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleUnmortgage = async (position: number) => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:unmortgageProperty", { roomId, position });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleOwnerAuction = async (position: number) => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:startOwnerAuction", { roomId, position });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleProposeTrade = async (
    toPlayerId: string,
    offer: TradeOffer,
    request: TradeOffer,
  ) => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:proposeTrade", {
        roomId,
        tradeId: crypto.randomUUID(),
        toPlayerId,
        offer,
        request,
      });
      toast.success("Trade proposed");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleAcceptTrade = async (tradeId: string) => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:acceptTrade", { roomId, tradeId });
      setTradeOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleRejectTrade = async (tradeId: string) => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:rejectTrade", { roomId, tradeId });
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
  const myPlayer = myPlayerId ? state.players[myPlayerId] : null;
  const canManage =
    myPlayerId === activePlayerId &&
    (state.phase === "PRE_ROLL" || state.phase === "END_TURN") &&
    !!myPlayer;

  return (
    <div
      className={cn(
        "flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#0b0f17] font-sans text-gray-100 select-none",
        "lg:flex-row",
        "gap-3 p-2 sm:p-3 lg:gap-4 lg:p-4",
      )}
    >
      <Toaster position="top-center" richColors />

      {winnerId && (
        <WinScreen
          gameState={state}
          winnerId={winnerId}
          myPlayerId={myPlayerId}
        />
      )}

      {tradeOpen && myPlayerId && (
        <TradeModal
          state={state}
          myPlayerId={myPlayerId}
          loading={false}
          onClose={() => setTradeOpen(false)}
          onPropose={handleProposeTrade}
          onAccept={handleAcceptTrade}
          onReject={handleRejectTrade}
        />
      )}

      {/* NOTE: container-type:size enables cqi/cqb so the board fills the frame as a square without clipping. */}
      <main className="order-1 relative min-h-[min(100vw,calc(100dvh-12rem))] min-w-0 flex-1 [container-type:size] lg:min-h-0">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="aspect-square max-h-full max-w-full"
            style={{
              width: "min(100cqi, 100cqb)",
              height: "min(100cqi, 100cqb)",
            }}
          >
            <Board
              onRoll={handleRoll}
              onBuy={handleBuy}
              onDecline={handleDecline}
              onAuction={handleAuction}
              onEndTurn={handleEndTurn}
              onPlaceBid={handlePlaceBid}
              onPassAuction={handlePassAuction}
            />
          </div>
        </div>
      </main>

      <aside
        className={cn(
          "order-2 flex w-full shrink-0 flex-col gap-2.5 overflow-hidden p-3",
          "max-h-[14rem] lg:max-h-none lg:h-full lg:w-60 xl:w-72",
          GLASS_PANEL,
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-0.5 pb-2">
          <span className="bg-gradient-to-r from-[#4fc3f7] to-[#26c6da] bg-clip-text text-base font-black tracking-widest text-transparent">
            f4fun
          </span>
          {roomCode && (
            <div className="rounded-lg border border-[#2a3a52] bg-[#1a2332] px-2 py-0.5 text-[9px] font-medium text-gray-500 md:text-[10px]">
              <span className="font-mono font-bold text-[#4fc3f7]">
                {roomCode}
              </span>
            </div>
          )}
        </div>

        {canManage && myPlayer && (
          <PropertyManagePanel
            state={state}
            player={myPlayer}
            loading={false}
            onBuildHouse={handleBuildHouse}
            onSellHouse={handleSellHouse}
            onBuildHotel={handleBuildHotel}
            onSellHotel={handleSellHotel}
            onMortgage={handleMortgage}
            onUnmortgage={handleUnmortgage}
            onOwnerAuction={handleOwnerAuction}
            onOpenTrade={() => setTradeOpen(true)}
          />
        )}

        {!canManage && myPlayerId && (
          <button
            type="button"
            onClick={() => setTradeOpen(true)}
            className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10"
          >
            Open trades
            {(state.pendingTrades?.filter((t) => t.toPlayerId === myPlayerId)
              .length ?? 0) > 0
              ? " (!)"
              : ""}
          </button>
        )}

        <div className="flex min-h-0 w-full flex-1 flex-row gap-2 overflow-x-auto overflow-y-hidden lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto">
          {state.turnOrder.map((playerId) => (
            <div
              key={playerId}
              className="w-full min-w-[150px] shrink-0 lg:min-w-0"
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
