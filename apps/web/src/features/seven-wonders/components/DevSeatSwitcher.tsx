"use client";

import { FlaskConical, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useRoomStore } from "@/features/room/store/roomStore";
import { cn } from "@/lib/cn";
import type { StoredPlayer } from "@/lib/player-storage";
import { isDevModeEnabled, loadControlledIdentities } from "../dev-mode";

/**
 * Dev-mode seat switcher: swaps which player this browser controls by
 * rebinding the room-store identity — the game page then rejoins as that
 * seat and receives its private hand snapshot from the server.
 */
export function DevSeatSwitcher({
  roomCode,
  seatedPlayerIds,
}: {
  roomCode: string;
  seatedPlayerIds: string[];
}) {
  const myPlayerId = useRoomStore((s) => s.myPlayerId);
  const setMyIdentity = useRoomStore((s) => s.setMyIdentity);
  const [identities, setIdentities] = useState<StoredPlayer[]>([]);
  const [switching, setSwitching] = useState(false);

  const seatedKey = seatedPlayerIds.join(",");

  // NOTE: Read localStorage after mount so SSR markup matches the first client render.
  useEffect(() => {
    if (!isDevModeEnabled()) return;
    setIdentities(
      loadControlledIdentities(roomCode).filter((identity) =>
        seatedKey.split(",").includes(identity.playerId),
      ),
    );
  }, [roomCode, seatedKey]);

  const canSwitch = useMemo(() => identities.length > 1, [identities]);
  if (!canSwitch) return null;

  const handleSwitch = (seat: StoredPlayer) => {
    if (switching || seat.playerId === myPlayerId) return;
    setSwitching(true);
    // Rebinding identity triggers the game page's rejoin effect for this seat.
    setMyIdentity(seat.playerId, seat.name, seat.token, seat.playerSecret);
    setSwitching(false);
  };

  return (
    <div className="fixed right-3 top-20 z-40 w-44 rounded-xl border border-purple-400/40 bg-[#1a1028]/95 p-2.5 shadow-xl shadow-black/50 backdrop-blur-sm">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-purple-300">
        <FlaskConical className="h-3 w-3" />
        Dev seats
      </p>
      <div className="mt-2 flex flex-col gap-1">
        {identities.map((seat, i) => {
          const active = seat.playerId === myPlayerId;
          return (
            <button
              key={seat.playerId}
              type="button"
              disabled={switching || active}
              onClick={() => handleSwitch(seat)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs font-bold transition-colors",
                active
                  ? "border-purple-300/60 bg-purple-400/20 text-purple-100"
                  : "cursor-pointer border-white/10 bg-black/30 text-purple-200/70 hover:border-purple-300/40",
              )}
            >
              <Avatar avatarId={seat.token} size="xs" />
              <span className="min-w-0 flex-1 truncate">
                {i === 0 ? `${seat.name} (host)` : seat.name}
              </span>
              {!active && (
                <RefreshCw
                  className="h-3 w-3 shrink-0 opacity-60"
                  aria-label="Switch to this seat"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
