"use client";

import { BOARD_TILES, TILE_BY_POSITION } from "@f4fun/monopoly-engine";
import { cn } from "@/lib/cn";
import { useRoomStore } from "../../room/store/roomStore";
import { useGameStore } from "../store/gameStore";
import { GLASS_CARD, GLASS_PANEL } from "../theme/board-theme";
import { BoardTile } from "./BoardTile";
import { DiceTray } from "./DiceTray";
import { PropertyPanel } from "./PropertyPanel";

interface BoardProps {
  onRoll: () => void;
  onBuy: () => void;
  onDecline: () => void;
  onEndTurn: () => void;
}

export function Board({ onRoll, onBuy, onDecline, onEndTurn }: BoardProps) {
  const { state } = useGameStore();
  const { myPlayerId } = useRoomStore();

  const getPlayersOnTile = (position: number) => {
    if (!state) return [];
    return Object.values(state.players)
      .filter((p) => p.position === position && !p.isBankrupt)
      .map((p) => ({ id: p.id, token: p.token, name: p.name }));
  };

  const getOwnerInfo = (position: number) => {
    if (!state) return {};
    const tile = TILE_BY_POSITION.get(position);
    if (
      !tile ||
      (tile.type !== "property" &&
        tile.type !== "railroad" &&
        tile.type !== "utility")
    ) {
      return {};
    }

    const owner = Object.values(state.players).find((p) =>
      p.ownedPositions.includes(position),
    );

    if (!owner) return {};

    const isMortgaged = state.ownership[position]?.isMortgaged ?? false;
    const houses = owner.houses?.[position] || 0;
    const hotels = owner.hotels?.[position] || 0;

    return {
      ownerId: owner.id,
      ownerToken: owner.token,
      isMortgaged,
      houses,
      hotels,
    };
  };

  const getGridStyles = (position: number) => {
    if (position === 0) return { gridRow: 11, gridColumn: 11 };
    if (position > 0 && position < 10)
      return { gridRow: 11, gridColumn: 11 - position };
    if (position === 10) return { gridRow: 11, gridColumn: 1 };
    if (position > 10 && position < 20)
      return { gridRow: 11 - (position - 10), gridColumn: 1 };
    if (position === 20) return { gridRow: 1, gridColumn: 1 };
    if (position > 20 && position < 30)
      return { gridRow: 1, gridColumn: position - 20 + 1 };
    if (position === 30) return { gridRow: 1, gridColumn: 11 };
    if (position > 30 && position < 40)
      return { gridRow: position - 30 + 1, gridColumn: 11 };
    return {};
  };

  const activePlayerId = state?.turnOrder[state.activePlayerIndex];
  const isMyTurn = activePlayerId === myPlayerId;
  const currentPlayer = activePlayerId ? state?.players[activePlayerId] : null;

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden [container-type:size]",
        "rounded-2xl border border-white/[0.1] bg-[#0d1420]",
        "shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 grid gap-1 p-1.5 sm:gap-1.5 sm:p-2",
          "grid-rows-[minmax(0,2.15fr)_repeat(9,minmax(0,1fr))_minmax(0,2.15fr)]",
          "grid-cols-[minmax(0,2.15fr)_repeat(9,minmax(0,1fr))_minmax(0,2.15fr)]",
          "bg-gradient-to-br from-[#1a2740]/90 via-[#121a2a]/95 to-[#0d1420]",
        )}
      >
        {BOARD_TILES.map((tile) => (
          <div
            key={tile.position}
            style={getGridStyles(tile.position)}
            className="min-h-0 min-w-0"
          >
            <BoardTile
              tile={tile}
              playersOnTile={getPlayersOnTile(tile.position)}
              turnOrder={state?.turnOrder || []}
              {...getOwnerInfo(tile.position)}
            />
          </div>
        ))}

        <div
          className={cn(
            "relative col-start-2 col-end-11 row-start-2 row-end-11 flex flex-col items-center justify-between overflow-hidden",
            "rounded-xl px-[clamp(0.4rem,2cqmin,0.85rem)] py-[clamp(0.5rem,2.2cqmin,1.25rem)]",
            "[container-type:size]",
            GLASS_PANEL,
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1a2744]/55 via-[#111827]/35 to-[#0d1420]/55" />

          <div className="z-10 shrink-0 select-none text-center">
            <h1 className="text-[clamp(0.85rem,4.5cqmin,1.65rem)] font-black tracking-wider">
              <span className="bg-gradient-to-r from-[#4fc3f7] via-[#29b6f6] to-[#26c6da] bg-clip-text text-transparent">
                MONOPOLY
              </span>
            </h1>
            <p className="mt-0.5 text-[clamp(6px,1.4cqmin,9px)] font-semibold uppercase tracking-[0.2em] text-gray-500">
              Board Game House
            </p>
          </div>

          <div className="relative z-10 flex w-full max-w-full shrink-0 flex-col items-center justify-center">
            <DiceTray
              dice={state?.lastDice ?? null}
              isMyTurn={isMyTurn}
              phase={state?.phase ?? "PRE_ROLL"}
              onRoll={onRoll}
              onEndTurn={onEndTurn}
              loading={false}
            />

            {state?.phase === "BUY_OR_DECLINE" && isMyTurn && currentPlayer && (
              <div
                className={cn(
                  "absolute bottom-0 left-1/2 z-30 max-h-[min(100%,70cqb)] w-[min(55cqmin,90%)] -translate-x-1/2 overflow-y-auto",
                  "animate-in fade-in zoom-in-95 rounded-[clamp(0.5rem,1.5cqmin,0.85rem)] p-[clamp(0.25rem,1cqmin,0.5rem)] duration-200",
                  GLASS_CARD,
                )}
              >
                <PropertyPanel
                  position={currentPlayer.position}
                  playerCash={currentPlayer.cash}
                  onBuy={onBuy}
                  onDecline={onDecline}
                  loading={false}
                />
              </div>
            )}
          </div>

          <div className="z-10 shrink-0 select-none text-[clamp(6px,1.3cqmin,9px)] font-medium text-gray-600">
            {state?.turnOrder.length || 0} Players active
          </div>
        </div>
      </div>
    </div>
  );
}
