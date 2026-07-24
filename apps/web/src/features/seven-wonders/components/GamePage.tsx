"use client";

import type {
  GameEvent,
  GameState,
  PickAction,
  ScoreBreakdown,
} from "@f4fun/seven-wonders-engine";
import {
  canAfford,
  getCardById,
  getWonderById,
  hasChainFrom,
} from "@f4fun/seven-wonders-engine";
import type {
  SevenWondersPickReceivedPayload,
  SevenWondersStateSnapshotPayload,
} from "@f4fun/shared-types";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  Crown,
  ScrollText,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Confetti } from "@/components/animation/Confetti";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { GameLoader } from "@/components/ui/GameLoader";
import { useRoomStore } from "@/features/room/store/roomStore";
import { cn } from "@/lib/cn";
import { loadPlayer, loadRoom } from "@/lib/player-storage";
import { connectSocket, emitWithCallback, getSocket } from "@/lib/socket";
import { GAME_TITLE } from "../constants";
import { useSevenWondersStore } from "../store/gameStore";
import {
  type Affordability,
  CityTableau,
  EffectIcons,
  WonderBoard,
  WonderCard,
} from "./CardViews";
import { DevSeatSwitcher } from "./DevSeatSwitcher";
import { HOW_TO_PLAY_SEEN_KEY, HowToPlayOverlay } from "./HowToPlayOverlay";
import { RivalCityPanel } from "./RivalCityPanel";
import { TableSeats } from "./TableSeats";
import { TurnChronicle } from "./TurnChronicle";

const AGE_NUMERALS = { 1: "I", 2: "II", 3: "III" } as const;

function toastActionError(message: string) {
  if (/cannot afford|insufficient/i.test(message)) {
    toast.error("Insufficient funds");
    return;
  }
  toast.error(message);
}

const TABLE_BACKGROUND = {
  backgroundImage:
    "linear-gradient(to bottom, rgba(10,7,4,0.55), rgba(10,7,4,0.82)), url('/materials/empires-dawn-table.png')",
  backgroundSize: "cover",
  backgroundPosition: "center top",
  backgroundAttachment: "fixed",
} as const;

const SCORE_CATEGORIES: {
  key: Exclude<keyof ScoreBreakdown, "total">;
  label: string;
  chip: string;
}[] = [
  { key: "military", label: "War", chip: "bg-rose-500/20 text-rose-200" },
  { key: "coins", label: "Treasury", chip: "bg-yellow-500/20 text-yellow-200" },
  { key: "wonder", label: "Wonder", chip: "bg-amber-500/20 text-amber-200" },
  { key: "civilian", label: "Civic", chip: "bg-sky-500/20 text-sky-200" },
  {
    key: "science",
    label: "Science",
    chip: "bg-emerald-500/20 text-emerald-200",
  },
  {
    key: "commerce",
    label: "Commerce",
    chip: "bg-orange-500/20 text-orange-200",
  },
  { key: "guild", label: "Guilds", chip: "bg-violet-500/20 text-violet-200" },
];

export function SevenWondersGamePage() {
  const params = useParams();
  const codeFromUrl = (params.code as string)?.toUpperCase() ?? "";
  const reduceMotion = useReducedMotion();

  const roomId = useRoomStore((s) => s.roomId);
  const myPlayerId = useRoomStore((s) => s.myPlayerId);
  const myPlayerSecret = useRoomStore((s) => s.myPlayerSecret);
  const setRoom = useRoomStore((s) => s.setRoom);
  const setMyIdentity = useRoomStore((s) => s.setMyIdentity);
  const setGameType = useRoomStore((s) => s.setGameType);

  const state = useSevenWondersStore((s) => s.state);
  const submittedCount = useSevenWondersStore((s) => s.submittedCount);
  const totalPlayers = useSevenWondersStore((s) => s.totalPlayers);
  const lastTurnEvents = useSevenWondersStore((s) => s.lastTurnEvents);
  const chronicle = useSevenWondersStore((s) => s.chronicle);
  const chronicleOpen = useSevenWondersStore((s) => s.chronicleOpen);
  const showLastTurnPanel = useSevenWondersStore((s) => s.showLastTurnPanel);
  const setFromSnapshot = useSevenWondersStore((s) => s.setFromSnapshot);
  const setPickProgress = useSevenWondersStore((s) => s.setPickProgress);
  const setError = useSevenWondersStore((s) => s.setError);
  const setChronicleOpen = useSevenWondersStore((s) => s.setChronicleOpen);
  const dismissLastTurnPanel = useSevenWondersStore(
    (s) => s.dismissLastTurnPanel,
  );

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [ageBanner, setAgeBanner] = useState<1 | 2 | 3 | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [inspectPlayerId, setInspectPlayerId] = useState<string | null>(null);
  const prevAgeRef = useRef<1 | 2 | 3 | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(HOW_TO_PLAY_SEEN_KEY) !== "1") {
        setHelpOpen(true);
      }
    } catch {
      // NOTE: Private mode / blocked storage — skip auto-open.
    }
  }, []);

  const closeHelp = () => {
    setHelpOpen(false);
    try {
      localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, "1");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const storedPlayer = loadPlayer();
    const storedRoom = loadRoom();
    if (storedPlayer && !myPlayerId) {
      setMyIdentity(
        storedPlayer.playerId,
        storedPlayer.name,
        storedPlayer.token,
        storedPlayer.playerSecret,
      );
    }
    if (storedRoom) {
      setRoom(
        storedRoom.roomId,
        storedRoom.roomCode,
        [],
        storedRoom.gameType ?? "sevenWonders",
      );
      setGameType(storedRoom.gameType ?? "sevenWonders");
    }

    connectSocket();
    const socket = getSocket();
    const playerId = myPlayerId ?? storedPlayer?.playerId;
    const playerSecret = myPlayerSecret ?? storedPlayer?.playerSecret;
    const activeRoomId = roomId ?? storedRoom?.roomId;

    async function rejoin() {
      if (!activeRoomId || !playerId || !playerSecret) {
        setError("Missing session — rejoin from the lobby.");
        toast.error("Missing session — rejoin from the lobby.");
        setReady(true);
        return;
      }

      try {
        await emitWithCallback("sevenWonders:rejoin", {
          roomId: activeRoomId,
          playerId,
          playerSecret,
        });
      } catch (err) {
        const message = (err as Error).message;
        setError(message);
        toast.error(message);
      } finally {
        setReady(true);
      }
    }

    const onSnapshot = (data: SevenWondersStateSnapshotPayload) => {
      if (data?.state) {
        const nextState = data.state as unknown as GameState;
        setFromSnapshot(nextState, data.events as GameEvent[] | undefined);
        // Preserve selection while the card remains in our hand (other seats submitting).
        setSelectedCardId((prev) => {
          if (!prev) return null;
          const pid = myPlayerId ?? storedPlayer?.playerId;
          if (!pid) return null;
          const nextHand = nextState.hands[pid] ?? [];
          return nextHand.includes(prev) ? prev : null;
        });
      }
    };

    const onPick = (data: SevenWondersPickReceivedPayload) => {
      setPickProgress(data.submittedCount, data.totalPlayers);
    };

    socket.on("sevenWonders:stateSnapshot", onSnapshot);
    socket.on("sevenWonders:pickReceived", onPick);
    void rejoin();

    return () => {
      socket.off("sevenWonders:stateSnapshot", onSnapshot);
      socket.off("sevenWonders:pickReceived", onPick);
    };
  }, [
    roomId,
    myPlayerId,
    myPlayerSecret,
    setFromSnapshot,
    setPickProgress,
    setError,
    setRoom,
    setMyIdentity,
    setGameType,
  ]);

  const currentAge = state?.age ?? null;
  useEffect(() => {
    if (currentAge === null) return;
    if (prevAgeRef.current !== null && prevAgeRef.current !== currentAge) {
      setAgeBanner(currentAge);
      const timer = setTimeout(() => setAgeBanner(null), 2600);
      prevAgeRef.current = currentAge;
      return () => clearTimeout(timer);
    }
    prevAgeRef.current = currentAge;
  }, [currentAge]);

  const me = state && myPlayerId ? state.players[myPlayerId] : null;
  const hand = state && myPlayerId ? (state.hands[myPlayerId] ?? []) : [];
  const alreadyPicked = Boolean(myPlayerId && state?.pendingPicks[myPlayerId]);

  const submitPick = async (action: PickAction, useFreeBuild = false) => {
    if (!selectedCardId || !roomId || submitting || alreadyPicked) return;

    setSubmitting(true);
    setError(null);
    try {
      await emitWithCallback("sevenWonders:submitPick", {
        roomId,
        action,
        cardId: selectedCardId,
        ...(useFreeBuild ? { useFreeBuild: true } : {}),
      });
      toast.success(
        useFreeBuild
          ? "Built free of charge"
          : action === "PLAY"
            ? "Structure raised"
            : action === "DISCARD"
              ? "Sold to the treasury for 3 coins"
              : "Wonder stage erected",
      );
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toastActionError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const playFromDiscard = async () => {
    if (!selectedCardId || !roomId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await emitWithCallback("sevenWonders:playFromDiscard", {
        roomId,
        cardId: selectedCardId,
      });
      toast.success("Raised from the ruins");
      setSelectedCardId(null);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toastActionError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || !state || !me || !myPlayerId) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center text-amber-50"
        style={TABLE_BACKGROUND}
      >
        <GameLoader size="lg" label={`Loading ${GAME_TITLE}`} />
        <p className="mt-4 text-sm font-semibold tracking-[0.3em] text-amber-200/70 uppercase">
          {GAME_TITLE}
        </p>
      </div>
    );
  }

  if (state.phase === "GAME_OVER" && state.finalScores) {
    return (
      <GameOverScreen
        codeFromUrl={codeFromUrl}
        finalScores={state.finalScores}
        players={state.players}
      />
    );
  }

  const wonder = getWonderById(me.wonderId);
  const canStage = me.wonderStagesBuilt < wonder.stages.length;
  const stageAffordable =
    canStage &&
    canAfford(
      state,
      myPlayerId,
      wonder.stages[me.wonderStagesBuilt].cost,
      0,
    ) !== null;
  const canFreeBuild = me.pendingAbility?.type === "freeBuild";
  const resolvingDiscard =
    state.phase === "RESOLVING_ABILITY" &&
    me.pendingAbility?.type === "playDiscarded";
  const waitingOnDiscardAbility =
    state.phase === "RESOLVING_ABILITY" && !resolvingDiscard;

  // NOTE: Hints mirror engine validation exactly by calling the same helpers —
  // the server remains the sole authority when the pick is submitted.
  const affordabilityFor = (cardId: string): Affordability => {
    const card = getCardById(cardId);
    if (me.tableau.some((id) => getCardById(id).name === card.name)) {
      return { kind: "owned" };
    }
    if (hasChainFrom(me, card)) return { kind: "chain" };
    const trade = canAfford(
      state,
      myPlayerId,
      card.cost.resources ?? {},
      card.cost.coins ?? 0,
    );
    if (!trade) return { kind: "blocked" };
    if (trade.totalCoinCost === 0) return { kind: "free" };
    return { kind: "trade", coins: trade.totalCoinCost };
  };

  const selectedCard = selectedCardId ? getCardById(selectedCardId) : null;
  const selectedAffordability = selectedCardId
    ? affordabilityFor(selectedCardId)
    : null;
  // NOTE: Sell and Raise wonder remain available; only PLAY is gated by cost/owned.
  const canBuildSelected =
    selectedAffordability != null &&
    selectedAffordability.kind !== "owned" &&
    selectedAffordability.kind !== "blocked";
  const canFreeBuildSelected =
    selectedAffordability != null && selectedAffordability.kind !== "owned";
  const fanCards = resolvingDiscard ? state.discardPile : hand;
  const fanMid = (fanCards.length - 1) / 2;

  return (
    <div className="min-h-screen text-amber-50" style={TABLE_BACKGROUND}>
      <DevSeatSwitcher
        roomCode={codeFromUrl}
        seatedPlayerIds={state.turnOrder}
      />
      <AnimatePresence>
        {ageBanner && (
          <motion.div
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.15 }
            }
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.5 }}
            className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70"
          >
            <p className="text-sm font-bold uppercase tracking-[0.5em] text-amber-200/70">
              A new era dawns
            </p>
            <p className="mt-2 text-7xl font-black text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.45)]">
              Age {AGE_NUMERALS[ageBanner]}
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-100/70">
              Hands now pass{" "}
              {state.passDirection === "LEFT" ? (
                <ArrowLeft className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-30 border-b border-amber-400/15 bg-[#120d07]/85 px-4 py-2.5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-lg font-black uppercase tracking-[0.18em] text-transparent">
              {GAME_TITLE}
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-100/45">
              Room {codeFromUrl}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {([1, 2, 3] as const).map((age) => (
              <span
                key={age}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-black",
                  age === state.age
                    ? "border-amber-300 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                    : age < state.age
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300/50"
                      : "border-white/10 text-amber-100/25",
                )}
              >
                {AGE_NUMERALS[age]}
              </span>
            ))}
            <span className="ml-1 text-amber-200/60">
              {state.passDirection === "LEFT" ? (
                <ArrowLeft className="h-4 w-4" aria-label="Passing left" />
              ) : (
                <ArrowRight className="h-4 w-4" aria-label="Passing right" />
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setChronicleOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2.5 text-[11px] font-bold uppercase tracking-wider text-amber-100/70 transition hover:border-amber-400/30 hover:text-amber-100"
              aria-label="Open chronicle"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Chronicle
            </button>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-amber-100/70 transition hover:border-amber-400/30 hover:text-amber-100"
              aria-label="How to play"
            >
              <CircleHelp className="h-4 w-4" />
            </button>
            <p className="text-xs font-bold text-amber-100/70">
              {state.phase === "RESOLVING_ABILITY"
                ? "Resolving a wonder's power"
                : `Picks ${submittedCount}/${totalPlayers || state.turnOrder.length}`}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-44 pt-4">
        <TableSeats
          state={state}
          myPlayerId={myPlayerId}
          onSelectPlayer={setInspectPlayerId}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <WonderBoard
            wonderId={me.wonderId}
            stagesBuilt={me.wonderStagesBuilt}
          />
          <section className="rounded-xl border border-white/10 bg-black/30 px-3 py-3">
            <h2 className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/50">
              Your city
            </h2>
            <CityTableau tableau={me.tableau} />
          </section>
        </div>

        <section>
          <h2 className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.3em] text-amber-100/50">
            {resolvingDiscard
              ? "Choose a card from the ruins"
              : waitingOnDiscardAbility
                ? "A rival communes with the ruins"
                : alreadyPicked
                  ? "Pick sealed — awaiting the other empires"
                  : "Your hand — choose wisely"}
          </h2>

          {resolvingDiscard && state.discardPile.length === 0 ? (
            <p className="text-center text-sm text-amber-100/40">
              The ruins are empty
            </p>
          ) : (
            <div className="flex flex-wrap items-end justify-center gap-1 sm:gap-0">
              {fanCards.map((cardId, i) => (
                <motion.div
                  key={cardId}
                  className="sm:-mx-1"
                  style={
                    reduceMotion ? undefined : { rotate: (i - fanMid) * 3.5 }
                  }
                  initial={reduceMotion ? false : { opacity: 0, y: 60 }}
                  animate={{
                    opacity: 1,
                    y: reduceMotion ? 0 : Math.abs(i - fanMid) * 9,
                  }}
                  transition={{
                    delay: reduceMotion ? 0 : i * 0.06,
                    duration: reduceMotion ? 0 : 0.3,
                  }}
                >
                  <WonderCard
                    cardId={cardId}
                    selected={selectedCardId === cardId}
                    disabled={
                      submitting ||
                      (resolvingDiscard
                        ? false
                        : alreadyPicked || waitingOnDiscardAbility)
                    }
                    onSelect={() => setSelectedCardId(cardId)}
                    affordability={
                      resolvingDiscard ? undefined : affordabilityFor(cardId)
                    }
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-400/20 bg-[#120d07]/92 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm">
            {selectedCard ? (
              <span className="flex items-center gap-2 font-bold text-amber-50">
                {selectedCard.name}
                <span className="text-amber-100/70">
                  <EffectIcons
                    effect={selectedCard.effect}
                    iconClass="h-4 w-4"
                  />
                </span>
              </span>
            ) : (
              <span className="text-amber-100/45">
                {resolvingDiscard
                  ? "Select a ruined card to restore"
                  : "Select a card to act"}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {resolvingDiscard ? (
              <Button
                size="sm"
                disabled={!selectedCardId || submitting}
                onClick={() => void playFromDiscard()}
              >
                Restore from ruins
              </Button>
            ) : waitingOnDiscardAbility ? (
              <p className="text-sm text-amber-100/50">
                Waiting for the ability to resolve…
              </p>
            ) : alreadyPicked ? (
              <p className="text-sm font-semibold text-emerald-300">
                Locked in — {submittedCount}/
                {totalPlayers || state.turnOrder.length} empires ready
              </p>
            ) : (
              <>
                <Button
                  size="sm"
                  disabled={!selectedCardId || submitting}
                  onClick={() => {
                    if (selectedAffordability?.kind === "blocked") {
                      toast.error("Insufficient funds");
                      return;
                    }
                    if (!canBuildSelected) return;
                    void submitPick("PLAY");
                  }}
                >
                  Build
                </Button>
                {canFreeBuild && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={
                      !selectedCardId || submitting || !canFreeBuildSelected
                    }
                    onClick={() => void submitPick("PLAY", true)}
                  >
                    Build free
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!selectedCardId || submitting || !canStage}
                  onClick={() => {
                    if (!stageAffordable) {
                      toast.error("Insufficient funds");
                      return;
                    }
                    void submitPick("STAGE_WONDER");
                  }}
                  title={
                    canStage ? undefined : "All wonder stages are already built"
                  }
                >
                  Raise wonder
                </Button>
                <Button
                  size="sm"
                  variant="tokenGhost"
                  disabled={!selectedCardId || submitting}
                  onClick={() => void submitPick("DISCARD")}
                >
                  Sell (+3)
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <HowToPlayOverlay open={helpOpen} onClose={closeHelp} />
      <TurnChronicle
        lastTurnEvents={lastTurnEvents}
        chronicle={chronicle}
        showLastTurnPanel={showLastTurnPanel}
        chronicleOpen={chronicleOpen}
        onDismissLastTurn={dismissLastTurnPanel}
        onCloseChronicle={() => setChronicleOpen(false)}
      />
      <RivalCityPanel
        state={state}
        playerId={inspectPlayerId}
        myPlayerId={myPlayerId}
        onClose={() => setInspectPlayerId(null)}
      />
    </div>
  );
}

function GameOverScreen({
  codeFromUrl,
  finalScores,
  players,
}: {
  codeFromUrl: string;
  finalScores: Record<string, ScoreBreakdown>;
  players: Record<string, { name: string; token: string; wonderId: string }>;
}) {
  const rankings = Object.entries(finalScores).sort(
    (a, b) => b[1].total - a[1].total,
  );

  return (
    <div
      className="min-h-screen px-4 py-10 text-amber-50"
      style={TABLE_BACKGROUND}
    >
      <Confetti />
      <div className="mx-auto max-w-2xl">
        <p className="text-center text-xs font-bold uppercase tracking-[0.4em] text-amber-200/60">
          {GAME_TITLE} · Room {codeFromUrl}
        </p>
        <h1 className="mt-2 text-center text-4xl font-black tracking-tight">
          The dust settles
        </h1>

        <ul className="mt-8 flex flex-col gap-3">
          {rankings.map(([pid, score], i) => {
            const player = players[pid];
            const wonderName = player
              ? getWonderById(player.wonderId).name
              : "";
            return (
              <li
                key={pid}
                className={cn(
                  "rounded-xl border px-4 py-3",
                  i === 0
                    ? "border-amber-300/60 bg-amber-400/15 shadow-[0_0_24px_rgba(251,191,36,0.2)]"
                    : "border-white/10 bg-black/40",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-lg font-black text-amber-200/70">
                    {i + 1}
                  </span>
                  {player && <Avatar avatarId={player.token} size="sm" />}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-bold">
                      {player?.name ?? pid}
                      {i === 0 && (
                        <Crown
                          className="h-4 w-4 text-amber-300"
                          aria-label="Winner"
                        />
                      )}
                    </p>
                    <p className="truncate text-xs text-amber-100/50">
                      {wonderName}
                    </p>
                  </div>
                  <span className="font-mono text-2xl font-black text-amber-200">
                    {score.total}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SCORE_CATEGORIES.map(({ key, label, chip }) => (
                    <span
                      key={key}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        chip,
                      )}
                    >
                      {label} {score[key]}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
