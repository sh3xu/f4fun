"use client";

import type { GameType } from "@f4fun/shared-types";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GameLoader } from "@/components/ui/GameLoader";
import { GamePage as MonopolyGamePage } from "@/features/monopoly/components/GamePage";
import { useRoomStore } from "@/features/room/store/roomStore";
import { SevenWondersGamePage } from "@/features/seven-wonders/components/GamePage";
import { loadRoom } from "@/lib/player-storage";

export default function Page() {
  const params = useParams();
  const codeFromUrl = (params.code as string)?.toUpperCase() ?? "";
  const setGameType = useRoomStore((s) => s.setGameType);
  const [resolved, setResolved] = useState<GameType | null>(null);
  const [sessionMissing, setSessionMissing] = useState(false);

  useEffect(() => {
    const stored = loadRoom();
    const matchesRoute =
      stored != null && stored.roomCode.toUpperCase() === codeFromUrl;

    // NOTE: Only resolve from a room session that matches this URL — never from
    // the unscoped Zustand gameType, which may belong to a previous room.
    if (matchesRoute && stored.gameType) {
      setGameType(stored.gameType);
      setResolved(stored.gameType);
      setSessionMissing(false);
      return;
    }

    setResolved(null);
    setSessionMissing(true);
  }, [codeFromUrl, setGameType]);

  if (sessionMissing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-black px-4 text-center text-white">
        <p className="text-lg font-semibold">Missing session for this room</p>
        <p className="text-sm text-white/60">
          Open the game from the lobby so your seat can reconnect.
        </p>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <GameLoader size="lg" label="Loading game" />
      </div>
    );
  }

  if (resolved === "sevenWonders") {
    return <SevenWondersGamePage />;
  }

  return <MonopolyGamePage />;
}
