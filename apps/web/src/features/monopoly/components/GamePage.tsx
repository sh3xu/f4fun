"use client";

import type { GameEvent, GameState, TradeOffer } from "@f4fun/monopoly-engine";
import { timeoutSecsForPhase } from "@f4fun/monopoly-engine";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameLoader } from "@/components/ui/GameLoader";
import { useRoomStore } from "@/features/room/store/roomStore";
import { cn } from "@/lib/cn";
import { emitWithCallback, getSocket } from "@/lib/socket";
import { useDeferredGameEventToasts } from "../hooks/useDeferredGameEventToasts";
import { formatCashDeltaToast } from "../lib/cashDeltaToast";
import {
  activityEntriesFromEventLog,
  formatGameEvent,
  type GameEventLogBatch,
} from "../lib/formatGameEvent";
import { useGameStore } from "../store/gameStore";
import { Board } from "./Board";
import { type ActivityEntry, GameActivityFeed } from "./GameActivityFeed";
import { GameShell, GameShellTradeButton } from "./GameShell";
import { IncomingTradeOfferCard } from "./IncomingTradeOfferCard";
import { PlayerHUD } from "./PlayerHUD";
import { TradeModal } from "./TradeModal";
import { WinScreen } from "./WinScreen";

const SESSION_KEY = "monopoly_session";
const ACTIVITY_CAP = 500;

/** Monotonic suffix so activity rows stay unique across same-ms batches. */
let activityIdSeq = 0;

function nextActivityId(eventType: string): string {
  activityIdSeq += 1;
  return `${eventType}-${Date.now()}-${activityIdSeq}`;
}

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
  const [tradeOutcome, setTradeOutcome] = useState<string | null>(null);
  const [cashToast, setCashToast] = useState<{
    message: string;
    positive: boolean;
  } | null>(null);
  const actionErrorTimeoutRef = useRef<number | null>(null);
  const tradeOutcomeTimeoutRef = useRef<number | null>(null);
  const cashToastTimeoutRef = useRef<number | null>(null);
  const lastDisplayCashRef = useRef<number | null>(null);
  const trackedGameIdRef = useRef<string | undefined>(undefined);
  const myPlayerIdRef = useRef(myPlayerId);
  myPlayerIdRef.current = myPlayerId;

  const myDisplayCash = useGameStore((s) =>
    myPlayerId ? s.displayCash[myPlayerId] : undefined,
  );
  const gameId = useGameStore((s) => s.state?.gameId);

  const showError = useCallback((message: string) => {
    if (actionErrorTimeoutRef.current !== null) {
      window.clearTimeout(actionErrorTimeoutRef.current);
    }
    setActionError(message);
    actionErrorTimeoutRef.current = window.setTimeout(() => {
      setActionError((current) => (current === message ? null : current));
      actionErrorTimeoutRef.current = null;
    }, 4000);
  }, []);

  const showTradeOutcome = useCallback((message: string) => {
    if (tradeOutcomeTimeoutRef.current !== null) {
      window.clearTimeout(tradeOutcomeTimeoutRef.current);
    }
    setTradeOutcome(message);
    tradeOutcomeTimeoutRef.current = window.setTimeout(() => {
      setTradeOutcome((current) => (current === message ? null : current));
      tradeOutcomeTimeoutRef.current = null;
    }, 4000);
  }, []);

  const showCashToast = useCallback((delta: number) => {
    if (delta === 0) return;
    if (cashToastTimeoutRef.current !== null) {
      window.clearTimeout(cashToastTimeoutRef.current);
    }
    const message = formatCashDeltaToast(delta);
    setCashToast({ message, positive: delta > 0 });
    cashToastTimeoutRef.current = window.setTimeout(() => {
      setCashToast((current) =>
        current?.message === message ? null : current,
      );
      cashToastTimeoutRef.current = null;
    }, 4000);
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

  useEffect(() => {
    if (trackedGameIdRef.current !== gameId) {
      trackedGameIdRef.current = gameId;
      lastDisplayCashRef.current = null;
    }
    if (myDisplayCash === undefined) return;
    if (lastDisplayCashRef.current === null) {
      lastDisplayCashRef.current = myDisplayCash;
      return;
    }
    const delta = myDisplayCash - lastDisplayCashRef.current;
    lastDisplayCashRef.current = myDisplayCash;
    if (delta !== 0) showCashToast(delta);
  }, [gameId, myDisplayCash, showCashToast]);

  const appendActivityFromEvents = useCallback(
    (nextState: GameState, events: GameEvent[]) => {
      const me = myPlayerIdRef.current;
      const fresh: ActivityEntry[] = [];
      for (const event of events) {
        if (event.type === "GAME_WON") {
          setWinnerId(event.winnerId);
        }
        if (
          me &&
          event.type === "TRADE_COMPLETED" &&
          (event.initiatorId === me || event.partnerId === me)
        ) {
          const otherId =
            event.initiatorId === me ? event.partnerId : event.initiatorId;
          const otherName = nextState.players[otherId]?.name ?? "Player";
          setTradeOpen(false);
          showTradeOutcome(`Trade with ${otherName} was accepted`);
        }
        if (
          me &&
          event.type === "TRADE_REJECTED" &&
          (event.fromPlayerId === me || event.toPlayerId === me)
        ) {
          const cancelledByMe = event.rejectedByPlayerId === me;
          const otherId =
            event.fromPlayerId === me ? event.toPlayerId : event.fromPlayerId;
          const otherName = nextState.players[otherId]?.name ?? "Player";
          setTradeOpen(false);
          if (cancelledByMe && event.fromPlayerId === me) {
            showTradeOutcome(`Trade offer to ${otherName} was cancelled`);
          } else if (cancelledByMe) {
            showTradeOutcome(`You declined ${otherName}'s trade`);
          } else if (event.rejectedByPlayerId === event.fromPlayerId) {
            showTradeOutcome(`${otherName} cancelled their trade offer`);
          } else {
            showTradeOutcome(`${otherName} declined your trade`);
          }
        }
        const formatted = formatGameEvent(nextState, event);
        if (!formatted) continue;
        fresh.push({
          id: nextActivityId(event.type),
          playerId: formatted.playerId,
          playerName: formatted.playerName,
          message: formatted.message,
        });
      }
      if (fresh.length === 0) return;
      setActivityEntries((prev) => [...fresh, ...prev].slice(0, ACTIVITY_CAP));
    },
    [showTradeOutcome],
  );

  useDeferredGameEventToasts((events) => {
    const nextState = useGameStore.getState().state;
    if (!nextState) return;
    appendActivityFromEvents(nextState, events);
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
    await runAction(async () => {
      await emitWithCallback("game:rejectTrade", { roomId, tradeId });
      setTradeOpen(false);
    });
  };

  if (initializing || !state) {
    return (
      <div className="material-felt flex min-h-dvh flex-col items-center justify-center text-slate-800">
        <div className="relative z-[2] flex flex-col items-center">
          <GameLoader size="lg" label="Loading table" />
          <p className="mt-4 text-xl font-bold tracking-wide text-slate-800">
            Setting up the table...
          </p>
          <p className="mt-2 text-sm text-slate-500">
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

  const playerCards = state.turnOrder.map((playerId) => (
    <div
      key={playerId}
      className="w-[min(11.5rem,72vw)] shrink-0 md:w-full md:min-w-0"
    >
      <PlayerHUD
        player={state.players[playerId]}
        isActive={playerId === activePlayerId}
        isMe={playerId === myPlayerId}
        isBot={roomPlayers.find((p) => p.id === playerId)?.isBot ?? false}
        turnOrder={state.turnOrder}
        deadlineAt={playerId === activePlayerId ? state.actionDeadlineAt : null}
        deadlinePausedMs={
          playerId === activePlayerId ? state.actionDeadlinePausedMs : null
        }
        timerDurationSecs={
          playerId === activePlayerId
            ? timeoutSecsForPhase(state.phase, state.config)
            : null
        }
      />
    </div>
  ));

  return (
    <>
      {actionError && (
        <div className="fixed bottom-3 left-3 z-50 max-w-xs rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 shadow-md md:bottom-4">
          {actionError}
        </div>
      )}

      {tradeOutcome && (
        <div
          className={cn(
            "fixed left-3 z-50 max-w-xs rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900 shadow-md md:bottom-4",
            actionError ? "bottom-14" : "bottom-3",
          )}
        >
          {tradeOutcome}
        </div>
      )}

      {cashToast && (
        <div
          className={cn(
            "fixed left-3 z-50 max-w-xs rounded-xl px-3 py-2 text-xs font-bold shadow-md md:bottom-4",
            cashToast.positive
              ? "border border-teal-200 bg-teal-50 text-teal-900"
              : "border border-rose-200 bg-rose-50 text-rose-800",
            actionError && tradeOutcome
              ? "bottom-[6.5rem]"
              : actionError || tradeOutcome
                ? "bottom-14"
                : "bottom-3",
          )}
        >
          {cashToast.message}
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

      <GameShell
        roomCode={roomCode}
        tradeButton={
          myPlayerId ? (
            <GameShellTradeButton
              pendingCount={pendingTradeCount}
              onClick={() => setTradeOpen(true)}
            />
          ) : undefined
        }
        board={
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
        }
        hud={playerCards}
        activity={
          <GameActivityFeed
            entries={activityEntries}
            turnOrder={state?.turnOrder ?? []}
            className="w-full"
          />
        }
      />
    </>
  );
}
