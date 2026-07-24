"use client";

import type { RoomCreatedPayload } from "@f4fun/shared-types";
import { ArrowLeft, Gamepad2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DiceRoller } from "@/components/animation/DiceRoller";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { GameCard } from "@/components/ui/GameCard";
import { GameLoader } from "@/components/ui/GameLoader";
import { Input } from "@/components/ui/Input";
import { TableShell } from "@/components/ui/TableShell";
import { AVATARS } from "@/lib/avatars";
import { savePlayer, saveRoom } from "@/lib/player-storage";
import { connectSocket, emitWithCallback } from "@/lib/socket";
import { useRoomStore } from "../store/roomStore";

function tableError(message: string): string {
  const lower = message.toLowerCase();
  // NOTE: "Room is full" contains "room" — check capacity before the generic room match.
  if (lower.includes("full")) {
    return "That table's full — pull up a chair at another room.";
  }
  if (lower.includes("not found") || lower.includes("room")) {
    return "That room code didn't match — try again, or host a new table.";
  }
  return message;
}

export function HomePage() {
  const router = useRouter();
  const setRoom = useRoomStore((s) => s.setRoom);
  const setMyIdentity = useRoomStore((s) => s.setMyIdentity);

  const [mode, setMode] = useState<"menu" | "join_code">("menu");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Write your name on the seat card first.");
      return;
    }
    if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
      setError("Use letters and numbers only — no spaces or symbols.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      connectSocket();

      const response = await emitWithCallback<RoomCreatedPayload>(
        "room:create",
        {
          playerName: trimmed,
          token: selectedAvatar,
        },
      );

      setMyIdentity(
        response.playerId,
        trimmed,
        selectedAvatar,
        response.playerSecret,
      );
      setRoom(
        response.roomId,
        response.roomCode,
        response.players,
        response.gameType,
      );

      savePlayer({
        playerId: response.playerId,
        name: trimmed,
        token: selectedAvatar,
        playerSecret: response.playerSecret,
      });
      saveRoom({
        roomId: response.roomId,
        roomCode: response.roomCode,
        gameType: response.gameType,
      });

      router.push(`/room/${response.roomCode}`);
    } catch (err) {
      setError(tableError((err as Error).message));
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Write your name on the seat card first.");
      return;
    }
    if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
      setError("Use letters and numbers only — no spaces or symbols.");
      return;
    }
    if (!roomCode.trim()) {
      setError("Enter the 6-character room code to find the table.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      connectSocket();

      const response = await emitWithCallback<RoomCreatedPayload>("room:join", {
        roomCode: roomCode.trim().toUpperCase(),
        playerName: trimmed,
        token: selectedAvatar,
      });

      setMyIdentity(
        response.playerId,
        trimmed,
        selectedAvatar,
        response.playerSecret,
      );
      setRoom(
        response.roomId,
        response.roomCode,
        response.players,
        response.gameType,
      );

      savePlayer({
        playerId: response.playerId,
        name: trimmed,
        token: selectedAvatar,
        playerSecret: response.playerSecret,
      });
      saveRoom({
        roomId: response.roomId,
        roomCode: response.roomCode,
        gameType: response.gameType,
      });

      router.push(`/room/${response.roomCode}`);
    } catch (err) {
      setError(tableError((err as Error).message));
      setLoading(false);
    }
  };

  return (
    <TableShell
      title="f4fun"
      subtitle="Pull up a chair — roll the dice and play Monopoly with friends."
    >
      <div className="mb-5 flex justify-center animate-fade-in" aria-hidden>
        <DiceRoller dice={[3, 5]} animate={false} />
      </div>

      <GameCard stock="buyPrompt" dealIn className="w-full p-6 md:p-7">
        {mode === "menu" ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2.5">
              <label
                htmlFor="home-nickname"
                className="px-0.5 text-xs font-bold tracking-widest text-slate-500 uppercase"
              >
                Your nickname
              </label>
              <Input
                id="home-nickname"
                value={name}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^A-Za-z0-9]/g, "");
                  setName(next);
                  setError("");
                }}
                placeholder="Letters and numbers only"
                maxLength={16}
                disabled={loading}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="h-11 w-full rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-teal-500"
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="px-0.5 text-xs font-bold tracking-widest text-slate-500 uppercase">
                Choose your token
              </span>
              <div className="grid max-h-[140px] grid-cols-4 gap-2.5 overflow-y-auto pr-1">
                {AVATARS.map((avatar) => {
                  const isSelected = selectedAvatar === avatar.id;
                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar.id)}
                      disabled={loading}
                      aria-label={avatar.label}
                      aria-pressed={isSelected}
                      className={`relative flex min-h-11 items-center justify-center rounded-xl border p-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--material-focus-glow)] ${
                        isSelected
                          ? "scale-[1.02] border-teal-500 bg-teal-50 shadow-md"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <Avatar
                        avatarId={avatar.id}
                        size="sm"
                        backgroundColor={isSelected ? "#0d9488" : "transparent"}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed font-semibold text-rose-700">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Button
                variant="token"
                onClick={handleCreate}
                disabled={loading}
                className="h-12 flex-1 gap-2 font-extrabold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <GameLoader size="sm" />
                    <span>Setting table...</span>
                  </span>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Host a table</span>
                  </>
                )}
              </Button>

              <Button
                variant="tokenGhost"
                onClick={() => {
                  const trimmed = name.trim();
                  if (!trimmed) {
                    setError("Write your name on the seat card first.");
                    return;
                  }
                  if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
                    setError(
                      "Use letters and numbers only — no spaces or symbols.",
                    );
                    return;
                  }
                  setMode("join_code");
                  setError("");
                }}
                disabled={loading}
                className="h-12 flex-1 gap-2 font-extrabold"
              >
                <Gamepad2 className="h-4 w-4 text-teal-700" />
                <span>Join with code</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Avatar avatarId={selectedAvatar} size="md" />
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
                  Joining as
                </p>
                <p className="truncate text-sm font-bold text-slate-900">
                  {name.trim() || "Player"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <label
                htmlFor="home-room-code"
                className="px-0.5 text-xs font-bold tracking-widest text-slate-500 uppercase"
              >
                Enter 6-digit room code
              </label>
              <Input
                id="home-room-code"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setError("");
                }}
                placeholder="ABCDEF"
                maxLength={6}
                disabled={loading}
                autoFocus
                className="h-12 w-full rounded-xl border-slate-200 bg-white text-center font-mono text-xl font-extrabold tracking-widest text-teal-700 placeholder-slate-400 focus:border-teal-500"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed font-semibold text-rose-700">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                variant="tokenGhost"
                onClick={() => {
                  setMode("menu");
                  setError("");
                }}
                disabled={loading}
                className="h-12 flex-1 gap-2 font-bold"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>

              <Button
                variant="token"
                onClick={handleJoin}
                disabled={loading}
                className="h-12 flex-1 font-extrabold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <GameLoader size="sm" />
                    <span>Finding table...</span>
                  </span>
                ) : (
                  <span>Join room</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </GameCard>

      <p className="mt-8 max-w-md text-center text-[10px] font-semibold tracking-wide text-slate-500 md:text-xs">
        Real-time multiplayer · Bright digital board · 2–8 players
      </p>
    </TableShell>
  );
}
