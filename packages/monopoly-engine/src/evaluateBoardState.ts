import { TILE_BY_POSITION } from "./config/board.js";
import { calculateRent, ownsColorGroup } from "./rent.js";
import type { GameState, PlayerId } from "./types.js";

export interface BoardEvaluation {
  netWorth: number;
  cash: number;
  propertyValue: number;
  buildingValue: number;
  monopolyCount: number;
  rentPotential: number;
  opponentThreat: number;
  score: number;
}

function tileBaseValue(
  state: GameState,
  playerId: PlayerId,
  position: number,
): number {
  const tile = TILE_BY_POSITION.get(position);
  const ownership = state.ownership[position];
  if (!tile || !ownership || ownership.ownerId !== playerId) return 0;

  if (
    tile.type === "property" ||
    tile.type === "railroad" ||
    tile.type === "utility"
  ) {
    return ownership.isMortgaged ? tile.mortgageValue : tile.price;
  }
  return 0;
}

function buildingValueAt(
  state: GameState,
  playerId: PlayerId,
  position: number,
): number {
  const tile = TILE_BY_POSITION.get(position);
  if (tile?.type !== "property") return 0;

  const player = state.players[playerId];
  const houses = player?.houses[position] ?? 0;
  const hotels = player?.hotels[position] ?? 0;
  return houses * tile.houseCost + hotels * tile.houseCost * 5;
}

function countMonopolies(state: GameState, playerId: PlayerId): number {
  const groups = new Set<string>();
  for (const position of state.players[playerId]?.ownedPositions ?? []) {
    const tile = TILE_BY_POSITION.get(position);
    if (tile?.type === "property") {
      groups.add(tile.colorGroup);
    }
  }

  let count = 0;
  for (const group of groups) {
    if (ownsColorGroup(state, playerId, group as never)) {
      count++;
    }
  }
  return count;
}

function rentPotentialForPlayer(state: GameState, playerId: PlayerId): number {
  let total = 0;
  for (const position of state.players[playerId]?.ownedPositions ?? []) {
    const tile = TILE_BY_POSITION.get(position);
    if (!tile) continue;
    if (tile.type === "property") {
      total += calculateRent(state, position, 7);
    } else if (tile.type === "railroad" || tile.type === "utility") {
      total += calculateRent(state, position);
    }
  }
  return total;
}

function opponentRentThreat(state: GameState, playerId: PlayerId): number {
  let threat = 0;
  for (const id of state.turnOrder) {
    if (id === playerId) continue;
    const opponent = state.players[id];
    if (!opponent || opponent.isBankrupt) continue;
    threat += rentPotentialForPlayer(state, id);
  }
  return threat;
}

/** General-purpose board evaluation for a player (net worth + strategic metrics). */
export function evaluateBoardState(
  state: GameState,
  playerId: PlayerId,
): BoardEvaluation {
  const player = state.players[playerId];
  const cash = player?.cash ?? 0;

  let propertyValue = 0;
  let buildingValue = 0;
  for (const position of player?.ownedPositions ?? []) {
    propertyValue += tileBaseValue(state, playerId, position);
    buildingValue += buildingValueAt(state, playerId, position);
  }

  const monopolyCount = countMonopolies(state, playerId);
  const rentPotential = rentPotentialForPlayer(state, playerId);
  const opponentThreat = opponentRentThreat(state, playerId);
  const netWorth = cash + propertyValue + buildingValue;
  const score =
    netWorth + rentPotential * 2 + monopolyCount * 200 - opponentThreat * 0.25;

  return {
    netWorth,
    cash,
    propertyValue,
    buildingValue,
    monopolyCount,
    rentPotential,
    opponentThreat,
    score,
  };
}
