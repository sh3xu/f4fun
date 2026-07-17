"use client";

import type { GameEvent, GameState, TradeOffer } from "@f4fun/monopoly-engine";
import { timeoutSecsForPhase } from "@f4fun/monopoly-engine";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { GameLoader } from "@/components/ui/GameLoader";
import { RailFrame } from "@/components/ui/RailFrame";
import { useRoomStore } from "@/features/room/store/roomStore";
import { cn } from "@/lib/cn";
import { emitWithCallback, getSocket } from "@/lib/socket";
import { useDeferredGameEventToasts } from "../hooks/useDeferredGameEventToasts";
import {
  activityEntriesFromEventLog,
  formatGameEvent,
  type GameEventLogBatch,
} from "../lib/formatGameEvent";
import { useGameStore } from "../store/gameStore";
import { Board } from "./Board";
import { type ActivityEntry, GameActivityFeed } from "./GameActivityFeed";
import { IncomingTradeOfferCard } from "./IncomingTradeOfferCard";
import { PlayerHUD } from "./PlayerHUD";
import { TradeModal } from "./TradeModal";
import { WinScreen } from "./WinScreen";

const SESSION_KEY = "monopoly_session";
const ACTIVITY_CAP = 500;

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
    players: roomPlayers,
    setRoomId,
    setMyPlayerId,
    setMyPlayerSecret,
  } = useRoomStore();
  const { state, setFromSnapshot, applyServerUpdate, startDiceRoll } =
    useGameStore();
  const [initializing, setInitializing] = useState(true);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const showError = useCallback((message: string) => {
    setActionError(message);
    window.setTimeout(() => setActionError(null), 4000);
  }, []);

  useEffect(() => {
    if (!roomId && typeof window !== "undefined") {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const session: SessionData = JSON.parse(stored);
          const age = Date.now() - session.timestamp;

          if (age < 1000 * 60 * 60 && session.playerSecret) {
            setRoomId(session.roomId);
            setMyPlayerId(session.playerId);
            setMyPlayerSecret(session.playerSecret);

            const socket = getSocket();
            if (!socket.connected) {
              socket.connect();
            }
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

  const appendActivityFromEvents = useCallback(
    (nextState: GameState, events: GameEvent[]) => {
      const fresh: ActivityEntry[] = [];
      for (const event of events) {
        if (event.type === "GAME_WON") {
          setWinnerId(event.winnerId);
        }
        const formatted = formatGameEvent(nextState, event);
        if (!formatted) continue;
        fresh.push({
          id: `${event.type}-${Date.now()}-${fresh.length}`,
          playerId: formatted.playerId,
          playerName: formatted.playerName,
          message: formatted.message,
        });
      }
      if (fresh.length === 0) return;
      setActivityEntries((prev) => [...fresh, ...prev].slice(0, ACTIVITY_CAP));
    },
    [],
  );

  useDeferredGameEventToasts((event) => {
    const nextState = useGameStore.getState().state;
    if (!nextState) return;
    appendActivityFromEvents(nextState, [event]);
  });

  useEffect(() => {
    if (!roomId || !myPlayerId || !myPlayerSecret) return;

    const socket = getSocket();

    let cleanupListeners: (() => void) | null = null;
    let waitForConnection: NodeJS.Timeout | null = null;

    function setupListeners() {
      const handleStateSnapshot = (data: {
        state: GameState;
        eventLog?: GameEventLogBatch[];
      }) => {
        if (data?.state) {
          setFromSnapshot(data.state);
          if (data.state.winnerId) {
            setWinnerId(data.state.winnerId);
          }
          if (data.eventLog) {
            setActivityEntries(
              activityEntriesFromEventLog(
                data.state,
                data.eventLog,
                ACTIVITY_CAP,
              ),
            );
          }
          setInitializing(false);
        }
      };

      const handleStateUpdated = (data: {
        state: GameState;
        events: GameEvent[];
      }) => {
        const deferred = applyServerUpdate(data.state, data.events);
        if (!deferred) {
          appendActivityFromEvents(data.state, data.events);
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
        setInitializing(false);
      }, 5000);

      cleanupListeners = () => {
        clearTimeout(timeout);
        socket.off("game:stateSnapshot", handleStateSnapshot);
        socket.off("game:stateUpdated", handleStateUpdated);
      };
    }

    if (!socket.connected) {
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
    appendActivityFromEvents,
  ]);

  const runAction = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      showError((err as Error).message);
    }
  };

  const handleRoll = async () => {
    if (!roomId) return;
    startDiceRoll();
    await runAction(() => emitWithCallback("game:rollDice", { roomId }));
  };

  const handleBuy = async () => {
    if (!roomId) return;
    await runAction(() => emitWithCallback("game:buyProperty", { roomId }));
  };

  const handleDecline = async () => {
    if (!roomId) return;
    await runAction(() => emitWithCallback("game:declineProperty", { roomId }));
  };

  const handleAuction = async () => {
    if (!roomId) return;
    await runAction(() => emitWithCallback("game:startAuction", { roomId }));
  };

  const handlePlaceBid = async (amount: number) => {
    if (!roomId) return;
    await runAction(() =>
      emitWithCallback("game:placeBid", { roomId, amount }),
    );
  };

  const handlePassAuction = async () => {
    if (!roomId) return;
    await runAction(() => emitWithCallback("game:passAuction", { roomId }));
  };

  const handleEndTurn = async () => {
    if (!roomId) return;
    await runAction(() => emitWithCallback("game:endTurn", { roomId }));
  };

  const handlePayJailFine = async () => {
    if (!roomId) return;
    await runAction(() => emitWithCallback("game:payJailFine", { roomId }));
  };

  const handleUseGoojfCard = async () => {
    if (!roomId) return;
    await runAction(() => emitWithCallback("game:useGoojfCard", { roomId }));
  };

  const handleRollForJail = async () => {
    if (!roomId) return;
    startDiceRoll();
    await runAction(() => emitWithCallback("game:rollForJail", { roomId }));
  };

  const handleAcknowledgeCard = async () => {
    if (!roomId) return;
    await runAction(() => emitWithCallback("game:acknowledgeCard", { roomId }));
  };

  const handleBuildHouse = async (position: number) => {
    if (!roomId) return;
    await runAction(() =>
      emitWithCallback("game:buildHouse", { roomId, position }),
    );
  };

  const handleSellHouse = async (position: number) => {
    if (!roomId) return;
    await runAction(() =>
      emitWithCallback("game:sellHouse", { roomId, position }),
    );
  };

  const handleBuildHotel = async (position: number) => {
    if (!roomId) return;
    await runAction(() =>
      emitWithCallback("game:buildHotel", { roomId, position }),
    );
  };

  const handleSellHotel = async (position: number) => {
    if (!roomId) return;
    await runAction(() =>
      emitWithCallback("game:sellHotel", { roomId, position }),
    );
  };

  const handleMortgage = async (position: number) => {
    if (!roomId) return;
    await runAction(() =>
      emitWithCallback("game:mortgageProperty", { roomId, position }),
    );
  };

  const handleUnmortgage = async (position: number) => {
    if (!roomId) return;
    await runAction(() =>
      emitWithCallback("game:unmortgageProperty", { roomId, position }),
    );
  };

  const handleOwnerAuction = async (position: number) => {
    if (!roomId) return;
    await runAction(() =>
      emitWithCallback("game:startOwnerAuction", { roomId, position }),
    );
  };

  const handleSellToBank = async (position: number) => {
    if (!roomId) return;
    await runAction(() =>
      emitWithCallback("game:sellPropertyToBank", { roomId, position }),
    );
  };

  const handleProposeTrade = async (
    toPlayerId: string,
    offer: TradeOffer,
    request: TradeOffer,
  ) => {
    if (!roomId) return;
    await runAction(() =>
      emitWithCallback("game:proposeTrade", {
        roomId,
        tradeId: crypto.randomUUID(),
        toPlayerId,
        offer,
        request,
      }),
    );
  };

  const handleAcceptTrade = async (tradeId: string) => {
    if (!roomId) return;
    await runAction(async () => {
      await emitWithCallback("game:acceptTrade", { roomId, tradeId });
      setTradeOpen(false);
    });
  };

  const handleRejectTrade = async (tradeId: string) => {
    if (!roomId) return;
    await runAction(() =>
      emitWithCallback("game:rejectTrade", { roomId, tradeId }),
    );
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
        "gap-3 p-2.5 sm:p-3 lg:gap-4 lg:p-4",
      )}
    >
      {actionError && (
        <div className="fixed bottom-3 left-3 z-50 max-w-xs rounded-md border border-rose-400/30 bg-rose-950/90 px-3 py-2 text-xs text-rose-100">
          {actionError}
        </div>
      )}

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
              onAcknowledgeCard={handleAcknowledgeCard}
              onBuildHouse={handleBuildHouse}
              onSellHouse={handleSellHouse}
              onBuildHotel={handleBuildHotel}
              onSellHotel={handleSellHotel}
              onMortgage={handleMortgage}
              onUnmortgage={handleUnmortgage}
              onOwnerAuction={handleOwnerAuction}
              onSellToBank={handleSellToBank}
            />
          </div>
        </div>
      </main>

      <RailFrame
        as="aside"
        className={cn(
          "relative z-[2] order-2 flex w-full shrink-0 flex-col gap-2 overflow-y-auto p-2.5 lg:overflow-hidden",
          "max-h-[16rem] lg:max-h-none lg:h-full lg:w-48 xl:w-56",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-0.5 pb-2">
          <span className="bg-gradient-to-r from-[#4fc3f7] to-[#26c6da] bg-clip-text text-sm font-black tracking-widest text-transparent">
            f4fun
          </span>
          {roomCode && (
            <div className="rounded-md border border-white/10 bg-black/25 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
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
            className="relative h-auto w-full py-1 text-[11px]"
          >
            Trade
            {pendingTradeCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#4fc3f7] px-1 text-[10px] font-bold text-[#0b0f17]">
                {pendingTradeCount}
              </span>
            )}
          </Button>
        )}

        <p className="px-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/35">
          The ledger
        </p>

        <div className="grid w-full shrink-0 grid-cols-2 gap-1.5 overflow-x-hidden lg:min-h-0 lg:flex lg:flex-1 lg:flex-col lg:overflow-y-auto">
          {state.turnOrder.map((playerId) => (
            <div key={playerId} className="w-full lg:min-w-0">
              <PlayerHUD
                player={state.players[playerId]}
                isActive={playerId === activePlayerId}
                isMe={playerId === myPlayerId}
                isBot={
                  roomPlayers.find((p) => p.id === playerId)?.isBot ?? false
                }
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

        <GameActivityFeed
          entries={activityEntries}
          className="mt-1 w-full shrink-0"
        />
      </RailFrame>
    </div>
  );
}
