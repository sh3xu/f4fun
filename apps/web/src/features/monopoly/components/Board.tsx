"use client";

import { BOARD_TILES, TILE_BY_POSITION } from "@f4fun/monopoly-engine";
import { type CSSProperties, useCallback, useRef, useState } from "react";
import { PieceMover } from "@/components/animation/PieceMover";
import { cn } from "@/lib/cn";
import { getPlayerColor } from "@/lib/player-colors";
import { useRoomStore } from "../../room/store/roomStore";
import { useGameStore } from "../store/gameStore";
import {
  BOARD_OVERLAY_PANEL_CLASS,
  BOARD_TEXT_VARS,
  GLASS_PANEL,
} from "../theme/board-theme";
import { AuctionPanel } from "./AuctionPanel";
import { BoardTile } from "./BoardTile";
import { DiceTray } from "./DiceTray";
import { PropertyPanel } from "./PropertyPanel";

interface BoardProps {
  onRoll: () => void;
  onBuy: () => void;
  onDecline: () => void;
  onAuction: () => void;
  onEndTurn: () => void;
  onPlaceBid: (amount: number) => void;
  onPassAuction: () => void;
  onPayJailFine: () => void;
  onUseGoojfCard: () => void;
  onRollForJail: () => void;
  onBuildHouse: (position: number) => void;
  onSellHouse: (position: number) => void;
  onBuildHotel: (position: number) => void;
  onSellHotel: (position: number) => void;
  onMortgage: (position: number) => void;
  onUnmortgage: (position: number) => void;
  onOwnerAuction: (position: number) => void;
}

function getGridStyles(position: number): CSSProperties {
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
}

export function Board({
  onRoll,
  onBuy,
  onDecline,
  onAuction,
  onEndTurn,
  onPlaceBid,
  onPassAuction,
  onPayJailFine,
  onUseGoojfCard,
  onRollForJail,
  onBuildHouse,
  onSellHouse,
  onBuildHotel,
  onSellHotel,
  onMortgage,
  onUnmortgage,
  onOwnerAuction,
}: BoardProps) {
  const {
    state,
    displayPositions,
    pendingAnimation,
    completeDiceAnimation,
    completeMoveAnimation,
    setDisplayPosition,
    diceAnimationComplete,
    rollAnimationKey,
  } = useGameStore();
  const { myPlayerId } = useRoomStore();
  const boardRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [viewedPosition, setViewedPosition] = useState<number | null>(null);

  const movingPlayerId =
    pendingAnimation.type === "move" ? pendingAnimation.playerId : undefined;

  const getTileCenter = useCallback((position: number) => {
    const tile = tileRefs.current.get(position);
    const board = boardRef.current;
    if (!tile || !board) return null;
    const tileRect = tile.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    return {
      x: tileRect.left - boardRect.left + tileRect.width / 2,
      y: tileRect.top - boardRect.top + tileRect.height / 2,
    };
  }, []);

  const getPlayersOnTile = (position: number) => {
    if (!state) return [];
    return Object.values(state.players)
      .filter((p) => {
        if (p.isBankrupt) return false;
        if (p.id === movingPlayerId) return false;
        const displayPos = displayPositions[p.id] ?? p.position;
        return displayPos === position;
      })
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
      ownerName: owner.name,
      isMortgaged,
      houses,
      hotels,
    };
  };

  const activePlayerId = state?.turnOrder[state.activePlayerIndex];
  const isMyTurn = activePlayerId === myPlayerId;
  const currentPlayer = activePlayerId ? state?.players[activePlayerId] : null;
  const displayDice = pendingAnimation.dice ?? state?.lastDice ?? null;
  const isDiceAnimating =
    !diceAnimationComplete && pendingAnimation.type === "dice";
  const shouldAnimateDice =
    isDiceAnimating && rollAnimationKey > 0 && displayDice !== null;
  const animationsSettled =
    diceAnimationComplete && pendingAnimation.type === "none";
  const showPropertyCard =
    state?.phase === "BUY_OR_DECLINE" &&
    isMyTurn &&
    animationsSettled &&
    !!currentPlayer;
  const showAuction =
    state?.phase === "AUCTION" && !!state.auction && animationsSettled;
  const canManageProperties =
    isMyTurn && (state?.phase === "PRE_ROLL" || state?.phase === "END_TURN");
  const viewedOwnerInfo =
    viewedPosition !== null ? getOwnerInfo(viewedPosition) : {};
  const viewingOwnProperty =
    !!myPlayerId &&
    !!viewedOwnerInfo.ownerId &&
    viewedOwnerInfo.ownerId === myPlayerId;

  const movingPlayer =
    movingPlayerId && state?.players[movingPlayerId]
      ? state.players[movingPlayerId]
      : null;
  const movingColor =
    movingPlayer && state
      ? getPlayerColor(movingPlayer.id, state.turnOrder)
      : null;

  const centerBusy = showPropertyCard || showAuction;

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden [container-type:size]",
        "rounded-2xl border border-white/[0.1] bg-[#0d1420]",
        "shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]",
      )}
      style={BOARD_TEXT_VARS}
    >
      <div
        ref={boardRef}
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
            ref={(el) => {
              if (el) tileRefs.current.set(tile.position, el);
              else tileRefs.current.delete(tile.position);
            }}
            style={getGridStyles(tile.position)}
            className="min-h-0 min-w-0"
          >
            <BoardTile
              tile={tile}
              playersOnTile={getPlayersOnTile(tile.position)}
              turnOrder={state?.turnOrder || []}
              onClick={() => {
                if (
                  tile.type === "property" ||
                  tile.type === "railroad" ||
                  tile.type === "utility"
                ) {
                  setViewedPosition(tile.position);
                }
              }}
              {...getOwnerInfo(tile.position)}
            />
          </div>
        ))}

        {movingPlayer &&
          pendingAnimation.fromPosition !== undefined &&
          pendingAnimation.toPosition !== undefined && (
            <div className="pointer-events-none absolute inset-0 z-40">
              <PieceMover
                key={`${movingPlayer.id}-${pendingAnimation.fromPosition}-${pendingAnimation.toPosition}-${pendingAnimation.moveMode ?? "hop"}`}
                playerId={movingPlayer.id}
                token={movingPlayer.token}
                name={movingPlayer.name}
                fromPosition={pendingAnimation.fromPosition}
                toPosition={pendingAnimation.toPosition}
                mode={pendingAnimation.moveMode ?? "hop"}
                colorHex={movingColor?.hex}
                isActive={movingPlayer.id === activePlayerId}
                getTileCenter={getTileCenter}
                onStep={(position) =>
                  setDisplayPosition(movingPlayer.id, position)
                }
                onAnimationComplete={completeMoveAnimation}
              />
            </div>
          )}

        <div
          className={cn(
            "relative col-start-2 col-end-11 row-start-2 row-end-11 min-h-0 overflow-hidden",
            "rounded-xl",
            GLASS_PANEL,
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1a2744]/55 via-[#111827]/35 to-[#0d1420]/55" />

          {!centerBusy && (
            <>
              <div className="absolute top-0 right-0 left-0 z-10 shrink-0 px-[clamp(0.4rem,2cqmin,1rem)] pt-[clamp(0.5rem,2.2cqmin,1.5rem)] text-center select-none">
                <h1 className="text-[length:var(--board-text-xl)] font-black tracking-wider">
                  <span className="bg-gradient-to-r from-[#4fc3f7] via-[#29b6f6] to-[#26c6da] bg-clip-text text-transparent">
                    MONOPOLY
                  </span>
                </h1>
                <p className="mt-0.5 text-[length:var(--board-text-sm)] font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Board Game House
                </p>
              </div>

              <div className="absolute right-0 bottom-0 left-0 z-10 shrink-0 px-[clamp(0.4rem,2cqmin,1rem)] pb-[clamp(0.5rem,2.2cqmin,1.5rem)] text-center text-[length:var(--board-text-xs)] font-medium text-gray-600 select-none">
                {state?.turnOrder.length || 0} Players active
              </div>
            </>
          )}

          <div className="absolute inset-0 z-20 flex items-center justify-center p-[clamp(0.5rem,2.5cqmin,1.5rem)]">
            {showAuction && state?.auction ? (
              <div
                className={cn(
                  BOARD_OVERLAY_PANEL_CLASS,
                  "animate-in fade-in zoom-in-95 duration-300",
                )}
              >
                <AuctionPanel
                  auction={state.auction}
                  state={state}
                  myPlayerId={myPlayerId}
                  loading={false}
                  onBid={onPlaceBid}
                  onPass={onPassAuction}
                />
              </div>
            ) : showPropertyCard && currentPlayer ? (
              <div
                className={cn(
                  BOARD_OVERLAY_PANEL_CLASS,
                  "animate-in fade-in zoom-in-95 duration-300",
                )}
              >
                <PropertyPanel
                  mode="buy"
                  position={currentPlayer.position}
                  playerCash={currentPlayer.cash}
                  onBuy={onBuy}
                  onDecline={onDecline}
                  onAuction={onAuction}
                  loading={false}
                />
              </div>
            ) : viewedPosition !== null ? (
              <div
                className={cn(
                  BOARD_OVERLAY_PANEL_CLASS,
                  "animate-in fade-in zoom-in-95 duration-300",
                )}
              >
                {viewingOwnProperty && canManageProperties ? (
                  <PropertyPanel
                    mode="manage"
                    position={viewedPosition}
                    loading={false}
                    isMortgaged={viewedOwnerInfo.isMortgaged ?? false}
                    houses={viewedOwnerInfo.houses ?? 0}
                    hotels={viewedOwnerInfo.hotels ?? 0}
                    onBuild={() => {
                      const houses = viewedOwnerInfo.houses ?? 0;
                      if (houses >= 4) onBuildHotel(viewedPosition);
                      else onBuildHouse(viewedPosition);
                    }}
                    onSell={() => {
                      const hotels = viewedOwnerInfo.hotels ?? 0;
                      if (hotels > 0) onSellHotel(viewedPosition);
                      else onSellHouse(viewedPosition);
                    }}
                    onMortgage={() => onMortgage(viewedPosition)}
                    onUnmortgage={() => onUnmortgage(viewedPosition)}
                    onOwnerAuction={() => onOwnerAuction(viewedPosition)}
                    onClose={() => setViewedPosition(null)}
                  />
                ) : (
                  <PropertyPanel
                    mode="view"
                    position={viewedPosition}
                    onClose={() => setViewedPosition(null)}
                    ownerName={viewedOwnerInfo.ownerName}
                    isMortgaged={viewedOwnerInfo.isMortgaged}
                    houses={viewedOwnerInfo.houses}
                    hotels={viewedOwnerInfo.hotels}
                  />
                )}
              </div>
            ) : (
              <DiceTray
                dice={displayDice}
                isMyTurn={isMyTurn}
                phase={state?.phase ?? "PRE_ROLL"}
                onRoll={onRoll}
                onEndTurn={onEndTurn}
                onPayJailFine={onPayJailFine}
                onUseGoojfCard={onUseGoojfCard}
                onRollForJail={onRollForJail}
                goojfCards={currentPlayer?.goojfCards ?? 0}
                cash={currentPlayer?.cash ?? 0}
                loading={false}
                isDiceAnimating={shouldAnimateDice}
                awaitingRoll={
                  !diceAnimationComplete && pendingAnimation.type !== "none"
                }
                rollKey={rollAnimationKey}
                onDiceAnimationComplete={completeDiceAnimation}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
