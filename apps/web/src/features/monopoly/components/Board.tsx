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
    <div className="relative w-full max-w-[min(100vw-2rem,82vh)] max-h-[min(100vw-2rem,82vh)] aspect-square bg-[#0d1420] border border-white/[0.08] rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden shrink-0 mx-auto">
      <div className="absolute inset-0 grid grid-rows-[2.2fr_repeat(9,1fr)_2.2fr] grid-cols-[2.2fr_repeat(9,1fr)_2.2fr] gap-px p-px bg-[#1e2a3d]/80">
        {BOARD_TILES.map((tile) => (
          <div
            key={tile.position}
            style={getGridStyles(tile.position)}
            className="w-full h-full"
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
            "col-start-2 col-end-11 row-start-2 row-end-11 flex flex-col items-center justify-between py-3 px-2 md:py-5 relative overflow-hidden",
            GLASS_PANEL,
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a2744]/60 via-[#111827]/40 to-[#0d1420]/60 pointer-events-none" />
          <div className="text-center shrink-0 z-10 select-none">
            <h1 className="text-lg md:text-2xl font-black tracking-wider">
              <span className="bg-gradient-to-r from-[#4fc3f7] via-[#29b6f6] to-[#26c6da] bg-clip-text text-transparent">
                MONOPOLY
              </span>
            </h1>
            <p className="text-[7px] md:text-[9px] text-gray-500 font-semibold uppercase tracking-[0.2em] mt-0.5">
              Board Game House
            </p>
          </div>

          <div className="w-full flex flex-col justify-center items-center z-10 shrink-0 relative">
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
                  "absolute left-1/2 -translate-x-1/2 bottom-0 w-[240px] md:w-[320px] max-w-[90vw] animate-in fade-in zoom-in-95 duration-200 rounded-lg p-2 z-30",
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

          <div className="text-[7px] md:text-[9px] text-gray-600 font-medium z-10 select-none shrink-0">
            {state?.turnOrder.length || 0} Players active
          </div>
        </div>
      </div>
    </div>
  );
}
