"use client";

import type { PickAction } from "@f4fun/seven-wonders-engine";
import {
  getNeighborIds,
  getPlayerShields,
  getWonderById,
} from "@f4fun/seven-wonders-engine";
import type { SevenWondersPickReceivedPayload } from "@f4fun/shared-types";
import { motion, useReducedMotion } from "framer-motion";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { GameLoader } from "@/components/ui/GameLoader";
import { useRoomStore } from "@/features/room/store/roomStore";
import { loadPlayer, loadRoom } from "@/lib/player-storage";
import { connectSocket, emitWithCallback, getSocket } from "@/lib/socket";
import { useSevenWondersStore } from "../store/gameStore";
import { TableauCard, WonderCard, WonderStrip } from "./CardViews";

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
  const error = useSevenWondersStore((s) => s.error);
  const setFromSnapshot = useSevenWondersStore((s) => s.setFromSnapshot);
  const setPickProgress = useSevenWondersStore((s) => s.setPickProgress);
  const setError = useSevenWondersStore((s) => s.setError);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

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
        setError((err as Error).message);
      } finally {
        setReady(true);
      }
    }

    const onSnapshot = (data: { state: typeof state }) => {
      if (data?.state) {
        setFromSnapshot(data.state);
        setSelectedCardId(null);
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

  const me = state && myPlayerId ? state.players[myPlayerId] : null;
  const hand = state && myPlayerId ? (state.hands[myPlayerId] ?? []) : [];
  const alreadyPicked = Boolean(myPlayerId && state?.pendingPicks[myPlayerId]);

  const neighbors =
    state && myPlayerId
      ? (() => {
          const [leftId, rightId] = getNeighborIds(state, myPlayerId);
          return {
            left: state.players[leftId],
            right: state.players[rightId],
            leftShields: getPlayerShields(state.players[leftId]),
            rightShields: getPlayerShields(state.players[rightId]),
            myShields: getPlayerShields(state.players[myPlayerId]),
          };
        })()
      : null;

  const submitPick = async (action: PickAction) => {
    if (!selectedCardId || !roomId || submitting || alreadyPicked) return;

    setSubmitting(true);
    setError(null);
    try {
      await emitWithCallback("sevenWonders:submitPick", {
        roomId,
        action,
        cardId: selectedCardId,
      });
      toast.success(
        action === "PLAY"
          ? "Card played"
          : action === "DISCARD"
            ? "Discarded for 3 coins"
            : "Wonder stage built",
      );
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || !state || !me) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#1a1410] text-amber-50">
        <GameLoader size="lg" label="Loading Seven Wonders" />
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      </div>
    );
  }

  if (state.phase === "GAME_OVER" && state.finalScores) {
    const rankings = Object.entries(state.finalScores).sort(
      (a, b) => b[1].total - a[1].total,
    );
    return (
      <div className="min-h-screen bg-[#1a1410] px-4 py-10 text-amber-50">
        <div className="mx-auto max-w-lg">
          <h1 className="text-3xl font-black tracking-tight">Final scores</h1>
          <p className="mt-1 text-sm text-amber-100/60">Room {codeFromUrl}</p>
          <ul className="mt-6 flex flex-col gap-2">
            {rankings.map(([pid, score], i) => (
              <li
                key={pid}
                className="flex items-center justify-between rounded-md border border-amber-500/20 bg-amber-950/40 px-4 py-3"
              >
                <span className="font-semibold">
                  #{i + 1} {state.players[pid]?.name ?? pid}
                </span>
                <span className="font-mono text-lg font-bold">
                  {score.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const wonder = getWonderById(me.wonderId);
  const canStage = me.wonderStagesBuilt < wonder.stages.length;

  return (
    <div className="min-h-screen bg-[#1a1410] text-amber-50">
      <header className="border-b border-amber-500/15 bg-black/30 px-4 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-black tracking-wide">7 Wonders</h1>
            <p className="text-xs text-amber-100/55">
              Age {state.age} · Pass {state.passDirection.toLowerCase()} · Room{" "}
              {codeFromUrl}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">{me.coins} coins</p>
            <p className="text-xs text-amber-100/55">
              Waiting {submittedCount}/{totalPlayers || state.turnOrder.length}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-5">
        {neighbors && (
          <div className="grid gap-3 sm:grid-cols-3">
            <NeighborSummary
              label="West"
              name={neighbors.left.name}
              coins={neighbors.left.coins}
              shields={neighbors.leftShields}
              stages={neighbors.left.wonderStagesBuilt}
              wonderId={neighbors.left.wonderId}
            />
            <NeighborSummary
              label="You"
              name={me.name}
              coins={me.coins}
              shields={neighbors.myShields}
              stages={me.wonderStagesBuilt}
              wonderId={me.wonderId}
              highlight
            />
            <NeighborSummary
              label="East"
              name={neighbors.right.name}
              coins={neighbors.right.coins}
              shields={neighbors.rightShields}
              stages={neighbors.right.wonderStagesBuilt}
              wonderId={neighbors.right.wonderId}
            />
          </div>
        )}

        <WonderStrip
          wonderId={me.wonderId}
          stagesBuilt={me.wonderStagesBuilt}
        />

        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-100/50">
            Your city
          </h2>
          {me.tableau.length === 0 ? (
            <p className="text-sm text-amber-100/40">No cards built yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {me.tableau.map((id) => (
                <TableauCard key={id} cardId={id} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-100/50">
            Your hand
          </h2>
          <motion.div
            className="flex flex-wrap gap-2"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
          >
            {hand.map((cardId) => (
              <WonderCard
                key={cardId}
                cardId={cardId}
                selected={selectedCardId === cardId}
                disabled={alreadyPicked || submitting}
                onSelect={() => setSelectedCardId(cardId)}
              />
            ))}
          </motion.div>
        </section>

        {error && (
          <div className="rounded-md border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-amber-500/15 pt-4">
          <Button
            disabled={!selectedCardId || alreadyPicked || submitting}
            onClick={() => submitPick("PLAY")}
          >
            Play card
          </Button>
          <Button
            variant="tokenGhost"
            disabled={!selectedCardId || alreadyPicked || submitting}
            onClick={() => submitPick("DISCARD")}
          >
            Discard (+3)
          </Button>
          <Button
            variant="secondary"
            disabled={
              !selectedCardId || alreadyPicked || submitting || !canStage
            }
            onClick={() => submitPick("STAGE_WONDER")}
          >
            Build wonder stage
          </Button>
          {alreadyPicked && (
            <p className="flex items-center text-sm text-amber-100/50">
              Pick submitted — waiting for others
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function NeighborSummary({
  label,
  name,
  coins,
  shields,
  stages,
  wonderId,
  highlight,
}: {
  label: string;
  name: string;
  coins: number;
  shields: number;
  stages: number;
  wonderId: string;
  highlight?: boolean;
}) {
  const wonder = getWonderById(wonderId);
  return (
    <div
      className={
        highlight
          ? "rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2"
          : "rounded-md border border-white/10 bg-black/25 px-3 py-2"
      }
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100/45">
        {label}
      </p>
      <p className="font-semibold">{name}</p>
      <p className="mt-1 text-xs text-amber-100/65">
        {wonder.name} · {coins}$ · {shields} shields · stage {stages}
      </p>
    </div>
  );
}
