import { getCardById } from "./config/cards.js";
import { ALL_WONDERS, getWonderById } from "./config/wonders.js";
import { dealAge, shuffle } from "./deal.js";
import { resolveMilitary } from "./military.js";
import {
  canAfford,
  countPlayerCards,
  getNeighborIds,
  hasChainFrom,
} from "./resources.js";
import { computeFinalScores } from "./scoring.js";
import type {
  GameAction,
  GameEvent,
  GameState,
  PlayerConfig,
  PlayerState,
  RNG,
} from "./types.js";
import { MAX_PLAYERS, MIN_PLAYERS } from "./types.js";

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

export function applyAction(
  state: GameState,
  action: GameAction,
  rng: RNG = Math.random,
): { state: GameState; events: GameEvent[] } {
  if (action.type !== "SUBMIT_PICK") {
    throw new Error(`Unknown action type: ${action.type}`);
  }

  return submitPick(state, action, rng);
}

function submitPick(
  state: GameState,
  action: GameAction,
  rng: RNG,
): { state: GameState; events: GameEvent[] } {
  if (state.phase !== "DRAFTING") {
    throw new Error("Cannot submit pick outside DRAFTING phase");
  }

  const { playerId, action: pickAction, cardId } = action;
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);

  const hand = state.hands[playerId];
  if (!hand || !hand.includes(cardId)) {
    throw new Error(`Card ${cardId} is not in ${playerId}'s hand`);
  }

  if (state.pendingPicks[playerId]) {
    throw new Error(`Player ${playerId} has already submitted a pick`);
  }

  const next = structuredClone(state);
  next.pendingPicks[playerId] = { action: pickAction, cardId };

  const allSubmitted = state.turnOrder.every(
    (pid) => next.pendingPicks[pid] !== undefined,
  );

  if (!allSubmitted) {
    return { state: next, events: [] };
  }

  return resolveTurn(next, rng);
}

function resolveTurn(
  state: GameState,
  rng: RNG,
): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];

  for (const playerId of state.turnOrder) {
    const pick = state.pendingPicks[playerId];
    const player = state.players[playerId];

    switch (pick.action) {
      case "PLAY":
        resolvePlay(state, player, pick.cardId, events);
        break;
      case "DISCARD":
        resolveDiscard(state, player, pick.cardId, events);
        break;
      case "STAGE_WONDER":
        resolveStageWonder(state, player, pick.cardId, events);
        break;
    }

    const hand = state.hands[playerId];
    const idx = hand.indexOf(pick.cardId);
    hand.splice(idx, 1);
  }

  state.pendingPicks = {};

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

function resolvePlay(
  state: GameState,
  player: PlayerState,
  cardId: string,
  events: GameEvent[],
): void {
  const card = getCardById(cardId);

  if (player.tableau.some((id) => getCardById(id).name === card.name)) {
    throw new Error(`${player.id} already has ${card.name} in tableau`);
  }

  const isFreeChain = hasChainFrom(player, card);

  if (!isFreeChain) {
    const coinCost = card.cost.coins ?? 0;
    const resourceCost = card.cost.resources ?? {};

    const trade = canAfford(state, player.id, resourceCost, coinCost);
    if (!trade) {
      throw new Error(`${player.id} cannot afford ${card.name}`);
    }

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

  player.tableau.push(cardId);
  applyImmediateEffect(state, player, card.effect, events);

  events.push({
    type: "CARD_PLAYED",
    playerId: player.id,
    message: `${player.name} played ${card.name}`,
  });
}

function applyImmediateEffect(
  state: GameState,
  player: PlayerState,
  effect: import("./types.js").CardEffect,
  _events: GameEvent[],
): void {
  switch (effect.type) {
    case "coins":
      player.coins += effect.amount;
      break;
    case "coinsFromCards": {
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
      break;
    }
    default:
      break;
  }
}

function resolveDiscard(
  state: GameState,
  player: PlayerState,
  cardId: string,
  events: GameEvent[],
): void {
  state.discardPile.push(cardId);
  player.coins += 3;
  events.push({
    type: "CARD_DISCARDED",
    playerId: player.id,
    message: `${player.name} discarded a card for 3 coins`,
  });
}

function resolveStageWonder(
  state: GameState,
  player: PlayerState,
  _cardId: string,
  events: GameEvent[],
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

  player.coins -= trade.totalCoinCost;

  if (trade.leftCost > 0) {
    const [leftId] = getNeighborIds(state, player.id);
    state.players[leftId].coins += trade.leftCost;
  }
  if (trade.rightCost > 0) {
    const [, rightId] = getNeighborIds(state, player.id);
    state.players[rightId].coins += trade.rightCost;
  }

  player.wonderStagesBuilt++;

  if (stage.effect.type === "coins") {
    player.coins += stage.effect.amount;
  }

  events.push({
    type: "WONDER_STAGED",
    playerId: player.id,
    message: `${player.name} built wonder stage ${nextStage + 1}`,
  });
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
