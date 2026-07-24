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
  const gameType = useRoomStore((s) => s.gameType);
  const setGameType = useRoomStore((s) => s.setGameType);
  const [resolved, setResolved] = useState<GameType | null>(null);

  useEffect(() => {
    const stored = loadRoom();
    const matchesRoute =
      Boolean(stored?.roomCode) &&
      stored.roomCode.toUpperCase() === codeFromUrl;

    // NOTE: Ignore stale f4fun_room from a different code so we don't mount the wrong game UI.
    if (matchesRoute) {
      const next = stored?.gameType ?? gameType;
      setGameType(next);
      setResolved(next);
      return;
    }

    setResolved(gameType);
  }, [codeFromUrl, gameType, setGameType]);

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
