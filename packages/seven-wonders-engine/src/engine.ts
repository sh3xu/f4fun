import { getCardById } from "./config/cards.js";
import { ALL_WONDERS, getWonderById } from "./config/wonders.js";
import { dealAge, shuffle } from "./deal.js";
import { resolveMilitary } from "./military.js";
import {
  canAfford,
  countPlayerCards,
  getNeighborIds,
  hasChainFrom,
  type TradeResult,
} from "./resources.js";
import { computeFinalScores } from "./scoring.js";
import type {
  CardEffect,
  GameAction,
  GameEvent,
  GameState,
  PickAction,
  PlayerConfig,
  PlayerState,
  RNG,
  WonderStageEffect,
} from "./types.js";
import { MAX_PLAYERS, MIN_PLAYERS } from "./types.js";

/** Thrown when simultaneous resolution fails after all picks are in; pending queue is cleared. */
export class ResolveTurnError extends Error {
  readonly clearedState: GameState;

  constructor(message: string, clearedState: GameState) {
    super(message);
    this.name = "ResolveTurnError";
    this.clearedState = clearedState;
  }
}

export function createInitialState(
  gameId: string,
  players: PlayerConfig[],
  rng: RNG = Math.random,
): GameState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(
      `Player count must be ${MIN_PLAYERS}-${MAX_PLAYERS}, got ${players.length}`,
    );
  }

  const shuffledWonders = shuffle(ALL_WONDERS, rng);
  const assignedWonders = shuffledWonders.slice(0, players.length);

  const playerStates: Record<string, PlayerState> = {};
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    playerStates[p.id] = {
      id: p.id,
      name: p.name,
      token: p.token,
      coins: 3,
      wonderId: assignedWonders[i].id,
      wonderStagesBuilt: 0,
      tableau: [],
      militaryTokens: [],
      pendingAbility: null,
    };
  }

  let state: GameState = {
    gameId,
    phase: "DRAFTING",
    age: 1,
    passDirection: "LEFT",
    turnOrder: players.map((p) => p.id),
    players: playerStates,
    hands: {},
    discardPile: [],
    pendingPicks: {},
    ageDecks: [[], [], []],
  };

  state = dealAge(state, 1, rng);
  return state;
}

/**
 * Validates a pick against the current pre-resolution board.
 * Affordability uses today's board only — simultaneous drafts cannot see others' cards yet.
 */
export function validatePick(
  state: GameState,
  playerId: string,
  pickAction: PickAction,
  cardId: string,
  useFreeBuild = false,
): void {
  if (state.phase !== "DRAFTING") {
    throw new Error("Cannot submit pick outside DRAFTING phase");
  }

  if (hasUnresolvedPlayDiscarded(state)) {
    throw new Error("Must resolve playDiscarded abilities before drafting");
  }

  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);

  const hand = state.hands[playerId];
  if (!hand || !hand.includes(cardId)) {
    throw new Error(`Card ${cardId} is not in ${playerId}'s hand`);
  }

  if (state.pendingPicks[playerId]) {
    throw new Error(`Player ${playerId} has already submitted a pick`);
  }

  if (useFreeBuild) {
    if (pickAction !== "PLAY") {
      throw new Error("useFreeBuild only applies to PLAY picks");
    }
    if (player.pendingAbility?.type !== "freeBuild") {
      throw new Error(`${playerId} has no pending freeBuild ability`);
    }
  }

  switch (pickAction) {
    case "DISCARD":
      return;
    case "PLAY":
      validatePlayAffordable(state, player, cardId, useFreeBuild);
      return;
    case "STAGE_WONDER":
      validateStageWonderAffordable(state, player);
      return;
  }
}

function validatePlayAffordable(
  state: GameState,
  player: PlayerState,
  cardId: string,
  useFreeBuild: boolean,
): void {
  const card = getCardById(cardId);

  if (player.tableau.some((id) => getCardById(id).name === card.name)) {
    throw new Error(`${player.id} already has ${card.name} in tableau`);
  }

  if (useFreeBuild || hasChainFrom(player, card)) return;

  const coinCost = card.cost.coins ?? 0;
  const resourceCost = card.cost.resources ?? {};
  const trade = canAfford(state, player.id, resourceCost, coinCost);
  if (!trade) {
    throw new Error(`${player.id} cannot afford ${card.name}`);
  }
}

function validateStageWonderAffordable(
  state: GameState,
  player: PlayerState,
): void {
  const wonder = getWonderById(player.wonderId);
  const nextStage = player.wonderStagesBuilt;

  if (nextStage >= wonder.stages.length) {
    throw new Error(`${player.id} has already built all wonder stages`);
  }

  const stage = wonder.stages[nextStage];
  const trade = canAfford(state, player.id, stage.cost, 0);
  if (!trade) {
    throw new Error(`${player.id} cannot afford wonder stage ${nextStage + 1}`);
  }
}

export function applyAction(
  state: GameState,
  action: GameAction,
  rng: RNG = Math.random,
): { state: GameState; events: GameEvent[] } {
  switch (action.type) {
    case "SUBMIT_PICK":
      return submitPick(state, action, rng);
    case "PLAY_FROM_DISCARD":
      return playFromDiscard(state, action, rng);
    default: {
      const _exhaustive: never = action;
      throw new Error(
        `Unknown action type: ${(_exhaustive as GameAction).type}`,
      );
    }
  }
}

function submitPick(
  state: GameState,
  action: Extract<GameAction, { type: "SUBMIT_PICK" }>,
  rng: RNG,
): { state: GameState; events: GameEvent[] } {
  const { playerId, action: pickAction, cardId, useFreeBuild } = action;

  // NOTE: Reject illegal picks before they enter pendingPicks — otherwise an
  // unaffordable last pick deadlocks earlier players who already committed.
  validatePick(state, playerId, pickAction, cardId, useFreeBuild === true);

  const next = structuredClone(state);
  next.pendingPicks[playerId] = {
    action: pickAction,
    cardId,
    ...(useFreeBuild ? { useFreeBuild: true } : {}),
  };

  const allSubmitted = state.turnOrder.every(
    (pid) => next.pendingPicks[pid] !== undefined,
  );

  if (!allSubmitted) {
    return { state: next, events: [] };
  }

  try {
    return resolveTurn(next, rng);
  } catch (err) {
    // NOTE: Safety net if simultaneous resolve still fails after upfront checks.
    next.pendingPicks = {};
    throw new ResolveTurnError(
      err instanceof Error ? err.message : String(err),
      next,
    );
  }
}

interface PlannedPick {
  playerId: string;
  action: "PLAY" | "DISCARD" | "STAGE_WONDER";
  cardId: string;
  useFreeBuild: boolean;
  isFreeChain: boolean;
  trade: TradeResult | null;
}

function resolveTurn(
  state: GameState,
  rng: RNG,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];

  // Phase 1: validate + lock costs against the pre-resolution snapshot so
  // later seats cannot use resources played earlier in the same turn.
  const snapshot = structuredClone(state);
  const plans: PlannedPick[] = [];

  for (const playerId of state.turnOrder) {
    const pick = state.pendingPicks[playerId];
    const player = snapshot.players[playerId];
    const useFreeBuild = pick.useFreeBuild === true;

    switch (pick.action) {
      case "PLAY": {
        const card = getCardById(pick.cardId);
        if (player.tableau.some((id) => getCardById(id).name === card.name)) {
          throw new Error(`${player.id} already has ${card.name} in tableau`);
        }

        const isFreeChain = hasChainFrom(player, card);
        let trade: TradeResult | null = null;

        if (!isFreeChain && !useFreeBuild) {
          const coinCost = card.cost.coins ?? 0;
          const resourceCost = card.cost.resources ?? {};
          trade = canAfford(snapshot, playerId, resourceCost, coinCost);
          if (!trade) {
            throw new Error(`${player.id} cannot afford ${card.name}`);
          }
        }

        plans.push({
          playerId,
          action: "PLAY",
          cardId: pick.cardId,
          useFreeBuild,
          isFreeChain,
          trade,
        });
        break;
      }
      case "DISCARD":
        plans.push({
          playerId,
          action: "DISCARD",
          cardId: pick.cardId,
          useFreeBuild: false,
          isFreeChain: false,
          trade: null,
        });
        break;
      case "STAGE_WONDER": {
        const wonder = getWonderById(player.wonderId);
        const nextStage = player.wonderStagesBuilt;
        if (nextStage >= wonder.stages.length) {
          throw new Error(`${player.id} has already built all wonder stages`);
        }
        const stage = wonder.stages[nextStage];
        const trade = canAfford(snapshot, playerId, stage.cost, 0);
        if (!trade) {
          throw new Error(
            `${player.id} cannot afford wonder stage ${nextStage + 1}`,
          );
        }
        plans.push({
          playerId,
          action: "STAGE_WONDER",
          cardId: pick.cardId,
          useFreeBuild: false,
          isFreeChain: false,
          trade,
        });
        break;
      }
    }
  }

  // Phase 2a: pay locked costs, place cards / stages (defer coinsFromCards).
  const deferredCoinEffects: { playerId: string; effect: CardEffect }[] = [];

  for (const plan of plans) {
    const player = state.players[plan.playerId];

    switch (plan.action) {
      case "PLAY": {
        if (plan.useFreeBuild) {
          if (player.pendingAbility?.type !== "freeBuild") {
            throw new Error(`${player.id} has no pending freeBuild ability`);
          }
          player.pendingAbility = null;
          events.push({
            type: "FREE_BUILD_USED",
            playerId: player.id,
            message: `${player.name} used freeBuild`,
          });
        } else if (!plan.isFreeChain && plan.trade) {
          applyTradePayment(state, player, plan.trade);
        }

        player.tableau.push(plan.cardId);
        const card = getCardById(plan.cardId);
        queueImmediateEffect(player, card.effect, deferredCoinEffects);

        events.push({
          type: "CARD_PLAYED",
          playerId: player.id,
          message: `${player.name} played ${card.name}`,
        });
        break;
      }
      case "DISCARD":
        state.discardPile.push(plan.cardId);
        player.coins += 3;
        events.push({
          type: "CARD_DISCARDED",
          playerId: player.id,
          message: `${player.name} discarded a card for 3 coins`,
        });
        break;
      case "STAGE_WONDER": {
        if (!plan.trade) {
          throw new Error(`${player.id} missing trade plan for wonder stage`);
        }
        applyTradePayment(state, player, plan.trade);
        player.wonderStagesBuilt++;

        const wonder = getWonderById(player.wonderId);
        const stage = wonder.stages[player.wonderStagesBuilt - 1];
        applyWonderStageEffect(state, player, stage.effect, events);

        events.push({
          type: "WONDER_STAGED",
          playerId: player.id,
          message: `${player.name} built wonder stage ${player.wonderStagesBuilt}`,
        });
        break;
      }
    }

    const hand = state.hands[plan.playerId];
    const idx = hand.indexOf(plan.cardId);
    hand.splice(idx, 1);
  }

  // Phase 2b: coinsFromCards against the consistent post-build tableau state.
  for (const deferred of deferredCoinEffects) {
    applyCoinsFromCards(
      state,
      state.players[deferred.playerId],
      deferred.effect,
    );
  }

  state.pendingPicks = {};

  clearUnusablePlayDiscarded(state, events);

  if (hasUnresolvedPlayDiscarded(state)) {
    state.phase = "RESOLVING_ABILITY";
    return { state, events };
  }

  return continueAfterResolvedTurn(state, events, rng);
}

function applyTradePayment(
  state: GameState,
  player: PlayerState,
  trade: TradeResult,
): void {
  player.coins -= trade.totalCoinCost;

  if (trade.leftCost > 0) {
    const [leftId] = getNeighborIds(state, player.id);
    state.players[leftId].coins += trade.leftCost;
  }
  if (trade.rightCost > 0) {
    const [, rightId] = getNeighborIds(state, player.id);
    state.players[rightId].coins += trade.rightCost;
  }
}

function queueImmediateEffect(
  player: PlayerState,
  effect: CardEffect,
  deferredCoinEffects: { playerId: string; effect: CardEffect }[],
): void {
  switch (effect.type) {
    case "coins":
      player.coins += effect.amount;
      break;
    case "coinsFromCards":
      deferredCoinEffects.push({ playerId: player.id, effect });
      break;
    default:
      break;
  }
}

function applyCoinsFromCards(
  state: GameState,
  player: PlayerState,
  effect: CardEffect,
): void {
  if (effect.type !== "coinsFromCards") return;

  const [leftId, rightId] = getNeighborIds(state, player.id);
  const leftPlayer = state.players[leftId];
  const rightPlayer = state.players[rightId];
  let count = 0;
  if (effect.colour === "wonderStages") {
    count +=
      player.wonderStagesBuilt * effect.self +
      (leftPlayer.wonderStagesBuilt + rightPlayer.wonderStagesBuilt) *
        effect.neighbors;
  } else {
    count +=
      countPlayerCards(player, effect.colour) * effect.self +
      (countPlayerCards(leftPlayer, effect.colour) +
        countPlayerCards(rightPlayer, effect.colour)) *
        effect.neighbors;
  }
  player.coins += count;
}

function applyWonderStageEffect(
  state: GameState,
  player: PlayerState,
  effect: WonderStageEffect,
  events: GameEvent[],
): void {
  switch (effect.type) {
    case "coins":
      player.coins += effect.amount;
      break;
    case "freeBuild":
      player.pendingAbility = { type: "freeBuild" };
      events.push({
        type: "ABILITY_GRANTED",
        playerId: player.id,
        message: `${player.name} gained freeBuild`,
      });
      break;
    case "playDiscarded":
      if (state.discardPile.length === 0) {
        // NOTE: Official rules — empty discard means the ability is wasted.
        events.push({
          type: "ABILITY_GRANTED",
          playerId: player.id,
          message: `${player.name} playDiscarded wasted (empty discard)`,
        });
      } else {
        player.pendingAbility = { type: "playDiscarded" };
        events.push({
          type: "ABILITY_GRANTED",
          playerId: player.id,
          message: `${player.name} gained playDiscarded`,
        });
      }
      break;
    default:
      break;
  }
}

function hasUnresolvedPlayDiscarded(state: GameState): boolean {
  return state.turnOrder.some(
    (pid) => state.players[pid].pendingAbility?.type === "playDiscarded",
  );
}

function clearUnusablePlayDiscarded(
  state: GameState,
  events: GameEvent[],
): void {
  if (state.discardPile.length > 0) return;
  for (const pid of state.turnOrder) {
    const player = state.players[pid];
    if (player.pendingAbility?.type === "playDiscarded") {
      player.pendingAbility = null;
      events.push({
        type: "ABILITY_GRANTED",
        playerId: player.id,
        message: `${player.name} playDiscarded wasted (empty discard)`,
      });
    }
  }
}

function playFromDiscard(
  state: GameState,
  action: Extract<GameAction, { type: "PLAY_FROM_DISCARD" }>,
  rng: RNG,
): { state: GameState; events: GameEvent[] } {
  if (state.phase !== "RESOLVING_ABILITY") {
    throw new Error("Cannot play from discard outside RESOLVING_ABILITY phase");
  }

  const player = state.players[action.playerId];
  if (!player) throw new Error(`Unknown player: ${action.playerId}`);
  if (player.pendingAbility?.type !== "playDiscarded") {
    throw new Error(`${action.playerId} has no pending playDiscarded ability`);
  }

  const card = getCardById(action.cardId);
  if (player.tableau.some((id) => getCardById(id).name === card.name)) {
    throw new Error(`${player.id} already has ${card.name} in tableau`);
  }

  const next = structuredClone(state);
  const nextPlayer = next.players[action.playerId];
  const discardIdx = next.discardPile.indexOf(action.cardId);
  if (discardIdx === -1) {
    throw new Error(`Card ${action.cardId} is not in the discard pile`);
  }
  next.discardPile.splice(discardIdx, 1);
  nextPlayer.tableau.push(action.cardId);
  nextPlayer.pendingAbility = null;

  const events: GameEvent[] = [
    {
      type: "DISCARD_PLAYED",
      playerId: action.playerId,
      message: `${nextPlayer.name} played ${card.name} from discard`,
    },
  ];

  // Immediate coin effects only; coinsFromCards uses the post-placement state
  // (already includes this card / current neighbors).
  if (card.effect.type === "coins") {
    nextPlayer.coins += card.effect.amount;
  } else if (card.effect.type === "coinsFromCards") {
    applyCoinsFromCards(next, nextPlayer, card.effect);
  }

  clearUnusablePlayDiscarded(next, events);

  if (hasUnresolvedPlayDiscarded(next)) {
    return { state: next, events };
  }

  next.phase = "DRAFTING";
  return continueAfterResolvedTurn(next, events, rng);
}

function continueAfterResolvedTurn(
  state: GameState,
  events: GameEvent[],
  rng: RNG,
): { state: GameState; events: GameEvent[] } {
  const handSize = state.hands[state.turnOrder[0]].length;

  if (handSize > 1) {
    passHands(state);
    return { state, events };
  }

  for (const playerId of state.turnOrder) {
    state.discardPile.push(...state.hands[playerId]);
    state.hands[playerId] = [];
  }

  const afterMilitary = resolveMilitary(state);

  if (afterMilitary.age < 3) {
    const nextAge = (afterMilitary.age + 1) as 1 | 2 | 3;
    refreshFreeBuildForNewAge(afterMilitary);
    const dealt = dealAge(afterMilitary, nextAge, rng);
    events.push({
      type: "AGE_END",
      message: `Age ${afterMilitary.age} ended, beginning Age ${nextAge}`,
    });
    return { state: dealt, events };
  }

  afterMilitary.phase = "GAME_OVER";
  afterMilitary.finalScores = computeFinalScores(afterMilitary);
  events.push({ type: "GAME_OVER", message: "Game over" });
  return { state: afterMilitary, events };
}

function refreshFreeBuildForNewAge(state: GameState): void {
  for (const playerId of state.turnOrder) {
    const player = state.players[playerId];
    if (playerHasFreeBuildStage(player)) {
      // NOTE: MVP approximates Olympia's once-per-age free build by re-granting
      // at age boundaries. Mid-age timing / opt-out nuances are not modeled.
      player.pendingAbility = { type: "freeBuild" };
    }
  }
}

function playerHasFreeBuildStage(player: PlayerState): boolean {
  const wonder = getWonderById(player.wonderId);
  for (let i = 0; i < player.wonderStagesBuilt; i++) {
    if (wonder.stages[i].effect.type === "freeBuild") return true;
  }
  return false;
}

function passHands(state: GameState): void {
  const order = state.turnOrder;
  const n = order.length;
  const oldHands = { ...state.hands };

  if (state.passDirection === "LEFT") {
    for (let i = 0; i < n; i++) {
      const from = order[i];
      const to = order[(i - 1 + n) % n];
      state.hands[to] = oldHands[from];
    }
  } else {
    for (let i = 0; i < n; i++) {
      const from = order[i];
      const to = order[(i + 1) % n];
      state.hands[to] = oldHands[from];
    }
  }
}

export function getPublicStateForPlayer(
  state: GameState,
  playerId: string,
): GameState {
  const result = structuredClone(state);

  for (const pid of state.turnOrder) {
    if (pid !== playerId) {
      result.hands[pid] = [];
    }
  }

  return result;
}
