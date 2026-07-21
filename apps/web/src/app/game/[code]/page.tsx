"use client";

import type { GameType } from "@f4fun/shared-types";
import { useEffect, useState } from "react";
import { GameLoader } from "@/components/ui/GameLoader";
import { GamePage as MonopolyGamePage } from "@/features/monopoly/components/GamePage";
import { useRoomStore } from "@/features/room/store/roomStore";
import { SevenWondersGamePage } from "@/features/seven-wonders/components/GamePage";
import { loadRoom } from "@/lib/player-storage";

export default function Page() {
  const gameType = useRoomStore((s) => s.gameType);
  const setGameType = useRoomStore((s) => s.setGameType);
  const [resolved, setResolved] = useState<GameType | null>(null);

  useEffect(() => {
    const stored = loadRoom();
    const next = stored?.gameType ?? gameType;
    setGameType(next);
    setResolved(next);
  }, [gameType, setGameType]);

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
