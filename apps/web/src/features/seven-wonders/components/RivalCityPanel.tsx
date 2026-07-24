"use client";

import {
  type GameState,
  getNeighborIds,
  getPlayerShields,
  getWonderById,
} from "@f4fun/seven-wonders-engine";
import { CounterTicker } from "@/components/animation/CounterTicker";
import { OverlayPanel } from "@/components/ui/OverlayPanel";
import { CityTableau, WonderBoard } from "./CardViews";
import { CoinIcon, LaurelIcon, ShieldIcon } from "./icons";

function militaryScore(tokens: number[]): number {
  return tokens.reduce((sum, t) => sum + t, 0);
}

interface RivalCityPanelProps {
  state: GameState;
  playerId: string | null;
  myPlayerId: string;
  onClose: () => void;
}

export function RivalCityPanel({
  state,
  playerId,
  myPlayerId,
  onClose,
}: RivalCityPanelProps) {
  const player = playerId ? state.players[playerId] : null;
  const wonder = player ? getWonderById(player.wonderId) : null;
  const [westId, eastId] = getNeighborIds(state, myPlayerId);
  const relation =
    !playerId || !player
      ? ""
      : playerId === myPlayerId
        ? "Your city"
        : playerId === westId
          ? "West neighbor"
          : playerId === eastId
            ? "East neighbor"
            : "Rival empire";

  return (
    <OverlayPanel
      open={Boolean(player && wonder)}
      onClose={onClose}
      title={player?.name ?? "City"}
      size="lg"
    >
      {player && wonder ? (
        <>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-amber-100/50">
            {relation} · {wonder.name}
          </p>

          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-bold text-amber-50">
            <span
              className="inline-flex items-center gap-1"
              title="Coins — treasury"
            >
              <CoinIcon className="h-4 w-4" />
              <CounterTicker value={player.coins} prefix="" />
            </span>
            <span
              className="inline-flex items-center gap-1"
              title="Shields — military strength"
            >
              <ShieldIcon className="h-4 w-4" />
              {getPlayerShields(player)}
            </span>
            <span
              className="inline-flex items-center gap-1"
              title="War tokens — victory points from age battles"
            >
              <LaurelIcon className="h-4 w-4" />
              {militaryScore(player.militaryTokens)}
            </span>
            <span className="text-amber-100/45" title="Wonder stages built">
              Wonder {player.wonderStagesBuilt}/{wonder.stages.length}
            </span>
          </div>

          <div className="mb-4">
            <WonderBoard
              wonderId={player.wonderId}
              stagesBuilt={player.wonderStagesBuilt}
            />
          </div>

          <section>
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/50">
              Built structures
            </h3>
            {player.tableau.length === 0 ? (
              <p className="text-sm text-amber-100/40">No structures yet</p>
            ) : (
              <CityTableau tableau={player.tableau} />
            )}
          </section>
        </>
      ) : null}
    </OverlayPanel>
  );
}
