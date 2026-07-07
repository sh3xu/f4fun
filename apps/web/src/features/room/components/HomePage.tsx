"use client";

import type { RoomCreatedPayload } from "@f4fun/shared-types";
import { ArrowLeft, Gamepad2, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AVATARS } from "@/lib/avatars";
import { savePlayer, saveRoom } from "@/lib/player-storage";
import { connectSocket, emitWithCallback } from "@/lib/socket";
import { useRoomStore } from "../store/roomStore";

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
    if (!name.trim()) {
      setError("Please enter your name to start the game");
      return;
    }

    setLoading(true);
    setError("");

    try {
      connectSocket();

      const response = await emitWithCallback<RoomCreatedPayload>(
        "room:create",
        {
          playerName: name.trim(),
          token: selectedAvatar,
        },
      );

      const myPlayer = response.players.find((p) => p.isHost);
      if (!myPlayer) throw new Error("Player not found in response");

      setMyIdentity(myPlayer.id, name.trim(), selectedAvatar);
      setRoom(response.roomId, response.roomCode, response.players);

      savePlayer({
        playerId: myPlayer.id,
        name: name.trim(),
        token: selectedAvatar,
      });
      saveRoom({ roomId: response.roomId, roomCode: response.roomCode });

      router.push(`/room/${response.roomCode}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!roomCode.trim()) {
      setError("Please enter the 6-character Room Code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      connectSocket();

      const response = await emitWithCallback<RoomCreatedPayload>("room:join", {
        roomCode: roomCode.trim().toUpperCase(),
        playerName: name.trim(),
        token: selectedAvatar,
      });

      const myPlayer = response.players.find((p) => p.name === name.trim());
      if (!myPlayer) throw new Error("Player not found in response");

      setMyIdentity(myPlayer.id, name.trim(), selectedAvatar);
      setRoom(response.roomId, response.roomCode, response.players);

      savePlayer({
        playerId: myPlayer.id,
        name: name.trim(),
        token: selectedAvatar,
      });
      saveRoom({ roomId: response.roomId, roomCode: response.roomCode });

      router.push(`/room/${response.roomCode}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Dynamic Background Mesh Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[60%] bg-blue-500/10 rounded-full filter blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full filter blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-[100px]" />
      </div>

      {/* Hero Section */}
      <header className="text-center mb-8 relative z-10 max-w-2xl select-none animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900/60 border border-slate-800/80 rounded-full text-xs text-indigo-400 font-semibold mb-4 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Real-time Multiplayer Monopoly</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent tracking-tight leading-none mb-3">
          f4fun
        </h1>
        <p className="text-slate-400 text-sm md:text-base font-medium max-w-md mx-auto leading-relaxed">
          The ultimate online board game experience. Invite your friends, roll
          the 3D dice, and conquer the board instantly!
        </p>
      </header>

      {/* Card Content Shell */}
      <Card className="w-full max-w-lg relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-800 bg-slate-900/75 backdrop-blur-md rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <CardContent className="p-6 md:p-8 flex flex-col gap-5">
          {mode === "menu" ? (
            <>
              {/* Form 1: Identity */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest px-0.5">
                  Your Nickname
                </span>
                <div className="relative">
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter your name to play..."
                    maxLength={16}
                    disabled={loading}
                    autoFocus
                    className="w-full h-11 bg-slate-950/80 border-slate-800 focus:border-indigo-500 text-slate-100 placeholder-slate-500 rounded-xl px-4 text-sm font-semibold shadow-inner transition-colors duration-200"
                  />
                </div>
              </div>

              {/* Form 2: Avatar Selection */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest px-0.5">
                  Choose Your Character
                </span>
                <div className="grid grid-cols-4 gap-2.5 max-h-[140px] overflow-y-auto pr-1 select-none">
                  {AVATARS.map((avatar) => {
                    const isSelected = selectedAvatar === avatar.id;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar.id)}
                        disabled={loading}
                        className={`p-2 relative rounded-xl transition-all duration-150 transform hover:scale-[1.05] flex items-center justify-center border ${
                          isSelected
                            ? "bg-slate-800 border-indigo-500/70 shadow-lg scale-[1.02]"
                            : "bg-slate-950/40 hover:bg-slate-950/80 border-slate-850/60"
                        }`}
                      >
                        <Avatar
                          avatarId={avatar.id}
                          size="sm"
                          backgroundColor={
                            isSelected ? "#6366f1" : "transparent"
                          }
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-300">
                  <span className="text-sm select-none">⚠️</span>
                  <p className="font-semibold leading-relaxed">{error}</p>
                </div>
              )}

              {/* Form 3: Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-slate-100 font-extrabold shadow-lg rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all duration-150 border border-indigo-500/30 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span>Creating...</span>
                    </span>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Host Game</span>
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    if (!name.trim()) {
                      setError("Please enter your name first");
                      return;
                    }
                    setMode("join_code");
                    setError("");
                  }}
                  disabled={loading}
                  variant="secondary"
                  className="flex-1 h-12 bg-slate-950/80 hover:bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-200 font-extrabold shadow-md rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all duration-150 cursor-pointer"
                >
                  <Gamepad2 className="w-4 h-4 text-emerald-400" />
                  <span>Join with Code</span>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                <Avatar avatarId={selectedAvatar} size="md" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                    Joining as
                  </p>
                  <p className="text-sm font-bold text-slate-100 truncate">
                    {name.trim() || "Player"}
                  </p>
                </div>
              </div>

              {/* Form 4: Enter Room Code */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest px-0.5">
                  Enter 6-Digit Room Code
                </span>
                <Input
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase());
                    setError("");
                  }}
                  placeholder="ABCDEF"
                  maxLength={6}
                  disabled={loading}
                  autoFocus
                  className="w-full h-12 bg-slate-950/80 border-slate-800 focus:border-indigo-500 text-center tracking-widest font-mono text-xl font-extrabold text-blue-400 placeholder-slate-600 rounded-xl shadow-inner transition-all"
                />
              </div>

              {error && (
                <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-300">
                  <span className="text-sm select-none">⚠️</span>
                  <p className="font-semibold leading-relaxed">{error}</p>
                </div>
              )}

              {/* Form 5: Join Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode("menu");
                    setError("");
                  }}
                  disabled={loading}
                  className="flex-1 h-12 border border-slate-800 hover:bg-slate-950 text-slate-300 rounded-xl flex items-center justify-center gap-2 font-bold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </Button>

                <Button
                  onClick={handleJoin}
                  disabled={loading}
                  className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-100 font-extrabold shadow-lg rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all duration-150 border border-emerald-500/20 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span>Joining...</span>
                    </span>
                  ) : (
                    <span>Join Room</span>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Start Guide */}
      <footer className="mt-8 text-center text-[10px] md:text-xs text-slate-500 select-none max-w-md">
        <p className="font-semibold tracking-wide">
          ⚡ FAST CONNECTION • 🎲 3D GSAP PHYSICS • 👥 2-8 MULTIPLAYER • 🎨 FULL
          VIEWPORT RENDER
        </p>
      </footer>
    </div>
  );
}
