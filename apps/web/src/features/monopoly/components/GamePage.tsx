"use client";

import type { GameEvent, GameState, TradeOffer } from "@f4fun/monopoly-engine";
import { TILE_BY_POSITION, timeoutSecsForPhase } from "@f4fun/monopoly-engine";
import { useCallback, useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { GameLoader } from "@/components/ui/GameLoader";
import { RailFrame } from "@/components/ui/RailFrame";
import { useRoomStore } from "@/features/room/store/roomStore";
import { cn } from "@/lib/cn";
import { emitWithCallback, getSocket } from "@/lib/socket";
import { useDeferredGameEventToasts } from "../hooks/useDeferredGameEventToasts";
import { useGameStore } from "../store/gameStore";
import { Board } from "./Board";
import { IncomingTradeOfferCard } from "./IncomingTradeOfferCard";
import { PlayerHUD } from "./PlayerHUD";
import { TradeModal } from "./TradeModal";
import { getTileLabel } from "./tile-labels";
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
      // NOTE: Read players from the store so this callback stays stable across state updates.
      const players = useGameStore.getState().state?.players;
      switch (event.type) {
        case "PROPERTY_BOUGHT": {
          const playerName = players?.[event.playerId]?.name || "Player";
          const tile = TILE_BY_POSITION.get(event.position);
          const propertyName = tile
            ? getTileLabel(tile.name)
            : `Position ${event.position}`;
          toast.success(`${playerName} bought ${propertyName}`, {
            duration: 3000,
          });
          break;
        }
        case "RENT_PAID": {
          const payerName = players?.[event.payerId]?.name || "Player";
          const ownerName = players?.[event.ownerId]?.name || "Owner";
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
          toast.info(
            `Auction started: ${tile ? getTileLabel(tile.name) : event.position}`,
            {
              duration: 2500,
            },
          );
          break;
        }
        case "AUCTION_WON": {
          const playerName = players?.[event.playerId]?.name || "Player";
          const tile = TILE_BY_POSITION.get(event.position);
          toast.success(
            `${playerName} won ${tile ? getTileLabel(tile.name) : event.position} for $${event.amount}`,
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
          const playerName = players?.[event.playerId]?.name || "Player";
          toast.error(`${playerName} went bankrupt!`, { duration: 4000 });
          break;
        }
        case "GAME_WON": {
          const winnerName = players?.[event.winnerId]?.name || "Winner";
          setWinnerId(event.winnerId);
          toast.success(`${winnerName} won the game!`, { duration: 5000 });
          break;
        }
        case "PASSED_GO": {
          const playerName = players?.[event.playerId]?.name || "Player";
          toast.success(`${playerName} passed GO! +$200`, { duration: 2000 });
          break;
        }
        case "SENT_TO_JAIL": {
          const playerName = players?.[event.playerId]?.name || "Player";
          toast.info(`${playerName} was sent to Jail`, { duration: 3000 });
          break;
        }
        case "RELEASED_FROM_JAIL": {
          const playerName = players?.[event.playerId]?.name || "Player";
          const methodLabel =
            event.method === "fine"
              ? "paid $50"
              : event.method === "card"
                ? "used a Jail Free card"
                : "rolled doubles";
          toast.success(`${playerName} left Jail (${methodLabel})`, {
            duration: 3000,
          });
          break;
        }
      }
    },
    [myPlayerId],
  );

  // NOTE: Dice-roll batches toast after token animation; other events toast immediately.
  const dispatchGameEventToasts = useDeferredGameEventToasts(handleEvent);

  // NOTE: Keep latest dispatcher in a ref so the socket effect does not re-subscribe
  // (and re-emit game:rejoin) on every game state change — that wiped dice animations.
  const dispatchGameEventToastsRef = useRef(dispatchGameEventToasts);
  dispatchGameEventToastsRef.current = dispatchGameEventToasts;

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
        dispatchGameEventToastsRef.current(data.events);
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
  }, [roomId, myPlayerId, myPlayerSecret, setFromSnapshot, applyServerUpdate]);

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

  const handlePayJailFine = async () => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:payJailFine", { roomId });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleUseGoojfCard = async () => {
    if (!roomId) return;
    try {
      await emitWithCallback("game:useGoojfCard", { roomId });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleRollForJail = async () => {
    if (!roomId) return;
    startDiceRoll();
    try {
      await emitWithCallback("game:rollForJail", { roomId });
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
      <div className="material-felt flex min-h-screen flex-col items-center justify-center text-gray-100">
        <div className="relative z-[2] flex flex-col items-center">
          <GameLoader size="lg" label="Loading table" />
          <p className="mt-4 text-xl font-bold tracking-wide text-gray-200">
            Setting up the table...
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Connecting to your game room
          </p>
        </div>
      </div>
    );
  }

  const activePlayerId = state.turnOrder[state.activePlayerIndex];
  const pendingTradeCount =
    myPlayerId == null
      ? 0
      : (state.pendingTrades?.filter((t) => t.toPlayerId === myPlayerId)
          .length ?? 0);

  return (
    <div
      className={cn(
        "material-felt flex h-dvh max-h-dvh flex-col overflow-hidden font-sans text-gray-100 select-none",
        "lg:flex-row",
        "gap-4 p-3 sm:p-4 lg:gap-6 lg:p-5",
      )}
    >
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          classNames: {
            toast:
              "material-cardstock !border-[var(--material-cardstock-edge)] !bg-[var(--material-cardstock-bg)] !text-gray-100",
          },
        }}
      />

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

      {myPlayerId && (
        <IncomingTradeOfferCard
          state={state}
          myPlayerId={myPlayerId}
          loading={false}
          onAccept={handleAcceptTrade}
          onReject={handleRejectTrade}
        />
      )}

      {/* NOTE: container-type:size enables cqi/cqb so the board fills the frame as a square without clipping. */}
      <main className="relative z-[2] order-1 min-h-[min(100vw,calc(100dvh-14rem))] min-w-0 flex-1 [container-type:size] lg:min-h-0">
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
              onPayJailFine={handlePayJailFine}
              onUseGoojfCard={handleUseGoojfCard}
              onRollForJail={handleRollForJail}
              onBuildHouse={handleBuildHouse}
              onSellHouse={handleSellHouse}
              onBuildHotel={handleBuildHotel}
              onSellHotel={handleSellHotel}
              onMortgage={handleMortgage}
              onUnmortgage={handleUnmortgage}
              onOwnerAuction={handleOwnerAuction}
            />
          </div>
        </div>
      </main>

      <RailFrame
        as="aside"
        className={cn(
          "relative z-[2] order-2 flex w-full shrink-0 flex-col gap-3 overflow-hidden p-3.5",
          "max-h-[18rem] lg:max-h-none lg:h-full lg:w-60 xl:w-72",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-0.5 pb-2.5">
          <span className="bg-gradient-to-r from-[#4fc3f7] to-[#26c6da] bg-clip-text text-base font-black tracking-widest text-transparent">
            f4fun
          </span>
          {roomCode && (
            <div className="rounded-md border border-white/10 bg-black/25 px-2 py-0.5 text-[9px] font-medium text-gray-500 md:text-[10px]">
              <span className="font-mono font-bold text-[#4fc3f7]">
                {roomCode}
              </span>
            </div>
          )}
        </div>

        {myPlayerId && (
          <Button
            type="button"
            variant={pendingTradeCount > 0 ? "token" : "tokenGhost"}
            onClick={() => setTradeOpen(true)}
            className="relative h-auto w-full py-1.5 text-xs"
          >
            Trade
            {pendingTradeCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#4fc3f7] px-1 text-[10px] font-bold text-[#0b0f17]">
                {pendingTradeCount}
              </span>
            )}
          </Button>
        )}

        <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">
          The ledger
        </p>

        <div className="grid min-h-0 w-full flex-1 grid-cols-2 gap-2.5 overflow-y-auto overflow-x-hidden lg:flex lg:flex-col lg:overflow-y-auto">
          {state.turnOrder.map((playerId) => (
            <div key={playerId} className="w-full lg:min-w-0">
              <PlayerHUD
                player={state.players[playerId]}
                isActive={playerId === activePlayerId}
                isMe={playerId === myPlayerId}
                turnOrder={state.turnOrder}
                deadlineAt={
                  playerId === activePlayerId ? state.actionDeadlineAt : null
                }
                deadlinePausedMs={
                  playerId === activePlayerId
                    ? state.actionDeadlinePausedMs
                    : null
                }
                timerDurationSecs={
                  playerId === activePlayerId
                    ? timeoutSecsForPhase(state.phase, state.config)
                    : null
                }
              />
            </div>
          ))}
        </div>
      </RailFrame>
    </div>
  );
}
