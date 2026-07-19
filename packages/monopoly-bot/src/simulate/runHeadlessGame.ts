import {
  applyAction,
  checkWinCondition,
  createInitialState,
  evaluateBoardState,
  type GameState,
  getActivePlayer,
  getCurrentAuctionBidder,
  getLegalActions,
  healStuckRaiseCash,
  type PlayerConfig,
  type PlayerId,
  phaseAfterDiceAction,
  type RNG,
  releaseCardRevealPause,
  timeoutActionForState,
} from "@f4fun/monopoly-engine";
import { BotPlayer } from "../decision/orchestrator.js";
import {
  partnerTradeConditionKey,
  pendingTradeFingerprint,
} from "../decision/tradeFingerprint.js";
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

function normalizeStuckState(state: GameState): void {
  healStuckRaiseCash(state);
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

    // NOTE: Headless has no card UI — skip the multiplayer reveal pause.
    if (decision.action.type === "ACKNOWLEDGE_CARD") {
      releaseCardRevealPause(state);
    }

    // NOTE: Recipient bot remembers on REJECT inside decide(); also stamp the
    // proposer so they never re-offer the same deal in a loop.
    if (decision.action.type === "REJECT_TRADE") {
      const rejectAction = decision.action;
      const trade = state.pendingTrades.find(
        (t) => t.tradeId === rejectAction.tradeId,
      );
      if (trade) {
        const fingerprint = pendingTradeFingerprint(trade);
        const partnerCondition = partnerTradeConditionKey(
          state,
          trade.toPlayerId,
        );
        bots
          .get(trade.fromPlayerId)
          ?.rememberRejectedTrade(fingerprint, partnerCondition);
      }
    }

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
