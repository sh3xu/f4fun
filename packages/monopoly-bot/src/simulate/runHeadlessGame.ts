import {
  applyAction,
  checkWinCondition,
  createInitialState,
  evaluateBoardState,
  type GameState,
  getActivePlayer,
  getCurrentAuctionBidder,
  getLegalActions,
  type PlayerConfig,
  type PlayerId,
  phaseAfterDiceAction,
  type RNG,
  timeoutActionForState,
} from "@f4fun/monopoly-engine";
import { BotPlayer } from "../decision/orchestrator.js";
import type { StrategyProfile } from "../strategy/types.js";

export interface HeadlessGameResult {
  state: GameState;
  turns: number;
  winnerId: PlayerId | null;
}

const MAX_TURNS = 3500;

/** NOTE: Long expert-only games may not bankrupt within turn cap; pick richest solvent player. */
function forceSimulationWinner(state: GameState): PlayerId | null {
  checkWinCondition(state);
  if (state.winnerId) return state.winnerId;

  const solvent = state.turnOrder.filter(
    (id) => !state.players[id]?.isBankrupt,
  );
  if (solvent.length === 0) return null;

  let bestId = solvent[0];
  let bestScore = evaluateBoardState(state, bestId).netWorth;
  for (const id of solvent.slice(1)) {
    const score = evaluateBoardState(state, id).netWorth;
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  state.winnerId = bestId;
  state.phase = "GAME_OVER";
  return bestId;
}

/** NOTE: Engine can leave RAISE_CASH with cleared pendingDebt after jail-move debt resolution. */
function normalizeStuckState(state: GameState): void {
  if (state.phase === "RAISE_CASH" && !state.pendingDebt) {
    const activeId = getActivePlayer(state);
    const player = activeId ? state.players[activeId] : null;
    state.phase = player?.isBankrupt ? "END_TURN" : phaseAfterDiceAction(state);
  }
}

export function resolveActorId(state: GameState): PlayerId | null {
  if (state.phase === "GAME_OVER" || state.winnerId) {
    return null;
  }

  if (state.pendingTrades.length > 0) {
    return state.pendingTrades[0]?.toPlayerId ?? null;
  }

  if (state.phase === "RAISE_CASH") {
    return state.pendingDebt?.playerId ?? getActivePlayer(state);
  }

  if (state.phase === "AUCTION") {
    return getCurrentAuctionBidder(state);
  }

  return getActivePlayer(state);
}

export function runHeadlessGame(
  players: PlayerConfig[],
  strategies: Map<PlayerId, StrategyProfile>,
  rng: RNG,
  gameId = "sim",
): HeadlessGameResult {
  const bots = new Map<PlayerId, BotPlayer>();
  for (const [id, strategy] of strategies) {
    bots.set(id, new BotPlayer(strategy));
  }

  let state = createInitialState(gameId, players, {}, rng);
  let turns = 0;

  while (
    state.phase !== "GAME_OVER" &&
    state.winnerId === null &&
    turns < MAX_TURNS
  ) {
    normalizeStuckState(state);

    if (state.phase === "BUY_OR_DECLINE") {
      const activeId = getActivePlayer(state);
      if (activeId) {
        const legal = getLegalActions(state, activeId);
        const hasProgress = legal.some(
          (a) => a.type === "BUY_PROPERTY" || a.type === "DECLINE_PROPERTY",
        );
        if (!hasProgress && legal.length === 0) {
          state.phase = phaseAfterDiceAction(state);
          turns++;
          continue;
        }
      }
    }

    const actorId = resolveActorId(state);
    if (!actorId) break;

    const bot = bots.get(actorId);
    if (!bot) {
      throw new Error(`No bot for actor ${actorId}`);
    }

    let legal = getLegalActions(state, actorId);
    if (
      legal.length === 0 &&
      state.phase === "RAISE_CASH" &&
      state.pendingDebt
    ) {
      legal = [{ type: "FORCE_SETTLE_DEBT" }];
    }
    if (legal.length === 0) {
      const timed = timeoutActionForState(state);
      if (timed && timed.actorId === actorId) {
        legal = [timed.action];
      }
    }

    const decision = bot.decide(state, actorId, legal, rng);
    const result = applyAction(state, decision.action, rng, actorId);

    if (result.error) {
      throw new Error(
        `Illegal bot action ${decision.action.type}: ${result.error}`,
      );
    }

    state = result.state;
    turns++;
  }

  const winnerId = state.winnerId ?? forceSimulationWinner(state);

  return {
    state,
    turns,
    winnerId,
  };
}
