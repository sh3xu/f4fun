import type { GameState, PlayerId } from "@f4fun/monopoly-engine";
import type { StrategyContext } from "../strategy/types.js";

function totalHousesOnBoard(state: GameState): number {
  let total = 0;
  for (const player of Object.values(state.players)) {
    for (const count of Object.values(player.houses)) {
      total += count;
    }
    for (const count of Object.values(player.hotels)) {
      total += count * 5;
    }
  }
  return total;
}

/** Dynamic cash reserve scales with board development (higher rent risk late-game). */
export function minimumCashBuffer(ctx: StrategyContext): number {
  const { state, actorId } = ctx;
  const player = state.players[actorId];
  if (!player) return 100;

  const houses = totalHousesOnBoard(state);
  const base = 75;
  const developmentBonus = Math.min(houses * 8, 400);
  const hasDevelopedMonopoly =
    Object.values(player.houses).length > 0 ||
    Object.values(player.hotels).length > 0;
  const monopolyBonus = hasDevelopedMonopoly ? 50 : 0;

  return base + developmentBonus + monopolyBonus;
}

export function postActionCashOk(
  ctx: StrategyContext,
  cashAfter: number,
): boolean {
  return cashAfter >= minimumCashBuffer(ctx);
}

export function opponentBuildingPressure(
  state: GameState,
  actorId: PlayerId,
): number {
  let pressure = 0;
  for (const id of state.turnOrder) {
    if (id === actorId) continue;
    const opponent = state.players[id];
    if (!opponent || opponent.isBankrupt) continue;
    for (const count of Object.values(opponent.houses)) {
      pressure += count * 25;
    }
    for (const count of Object.values(opponent.hotels)) {
      pressure += count * 100;
    }
  }
  return pressure;
}
