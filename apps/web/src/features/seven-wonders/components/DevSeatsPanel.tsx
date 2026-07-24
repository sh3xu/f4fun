"use client";

import type { PlayerInfo, RoomCreatedPayload } from "@f4fun/shared-types";
import { FlaskConical } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { loadPlayer } from "@/lib/player-storage";
import { emitWithCallback } from "@/lib/socket";
import { isDevModeEnabled, loadDevSeats, saveDevSeat } from "../dev-mode";

const MAX_SEATS = 7;

/**
 * Dev-mode lobby tool: seats phantom players this browser controls in-game.
 * Renders nothing unless localStorage devMode matches the dev secret.
 */
export function DevSeatsPanel({
  roomCode,
  playersCount,
  disabled,
  onPlayersUpdated,
}: {
  roomCode: string;
  playersCount: number;
  disabled?: boolean;
  onPlayersUpdated: (players: PlayerInfo[]) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  // NOTE: Read localStorage after mount so SSR markup matches the first client render.
  useEffect(() => {
    setEnabled(isDevModeEnabled());
  }, []);

  if (!enabled) return null;

  const handleAddSeat = async () => {
    if (adding || disabled || playersCount >= MAX_SEATS) return;

    setAdding(true);
    setError("");

    try {
      const seatNumber = loadDevSeats(roomCode).length + 2;
      const response = await emitWithCallback<RoomCreatedPayload>("room:join", {
        roomCode,
        playerName: `Dev${seatNumber}`,
        token: `memo_${((playersCount * 7) % 35) + 1}`,
      });

      saveDevSeat(roomCode, {
        playerId: response.playerId,
        name: `Dev${seatNumber}`,
        token:
          response.players.find((p) => p.id === response.playerId)?.token ??
          "memo_1",
        playerSecret: response.playerSecret,
      });

      // NOTE: room:join rebinds this socket to the phantom seat — restore the
      // real player's binding so host-only actions (start game) keep working.
      const realPlayer = loadPlayer();
      if (realPlayer) {
        await emitWithCallback("room:sync", {
          roomCode,
          playerId: realPlayer.playerId,
          playerSecret: realPlayer.playerSecret,
        });
      }

      onPlayersUpdated(response.players);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-purple-400/50 bg-purple-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-purple-700">
        <FlaskConical className="h-3.5 w-3.5" />
        Dev mode
      </p>
      <p className="mt-1 text-xs text-purple-900/70">
        Seat phantom players you can switch between in-game to playtest solo.
      </p>
      <Button
        variant="tokenGhost"
        size="sm"
        className="mt-2 w-full font-bold"
        disabled={disabled || adding || playersCount >= MAX_SEATS}
        onClick={() => void handleAddSeat()}
      >
        {adding ? "Seating..." : "Add dev seat"}
      </Button>
      {error && (
        <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>
      )}
    </div>
  );
}
