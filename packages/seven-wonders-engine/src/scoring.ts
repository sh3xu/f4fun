import { getCardById } from "./config/cards.js";
import { getWonderById } from "./config/wonders.js";
import { countPlayerCards, getNeighborIds } from "./resources.js";
import type {
  CardColour,
  GameState,
  PlayerState,
  Science,
  ScoreBreakdown,
} from "./types.js";

export function computeFinalScores(
  state: GameState,
): Record<string, ScoreBreakdown> {
  const scores: Record<string, ScoreBreakdown> = {};
  for (const playerId of state.turnOrder) {
    scores[playerId] = scorePlayer(state, playerId);
  }
  return scores;
}

function scorePlayer(state: GameState, playerId: string): ScoreBreakdown {
  const player = state.players[playerId];
  const [leftId, rightId] = getNeighborIds(state, playerId);
  const leftPlayer = state.players[leftId];
  const rightPlayer = state.players[rightId];

  const military = player.militaryTokens.reduce((a, b) => a + b, 0);
  const coins = Math.floor(player.coins / 3);
  const wonder = scoreWonderPoints(player);
  const civilian = scoreCivilian(player);
  const science = scoreScience(state, player, leftPlayer, rightPlayer);
  const commerce = scoreCommerce(player, leftPlayer, rightPlayer);
  const guild = scoreGuilds(player, leftPlayer, rightPlayer);

  return {
    military,
    coins,
    wonder,
    civilian,
    science,
    commerce,
    guild,
    total: military + coins + wonder + civilian + science + commerce + guild,
  };
}

function scoreWonderPoints(player: PlayerState): number {
  const wonder = getWonderById(player.wonderId);
  let points = 0;
  for (let i = 0; i < player.wonderStagesBuilt; i++) {
    const effect = wonder.stages[i].effect;
    if (effect.type === "points") points += effect.amount;
  }
  return points;
}

function scoreCivilian(player: PlayerState): number {
  let points = 0;
  for (const cardId of player.tableau) {
    const card = getCardById(cardId);
    if (card.colour === "blue" && card.effect.type === "points") {
      points += card.effect.amount;
    }
  }
  return points;
}

export function computeScienceScore(
  compass: number,
  tablet: number,
  gear: number,
  wilds: number,
): number {
  if (wilds === 0) {
    const sets = Math.min(compass, tablet, gear);
    return compass * compass + tablet * tablet + gear * gear + sets * 7;
  }

  let best = 0;
  assignWilds(compass, tablet, gear, wilds, (c, t, g) => {
    const sets = Math.min(c, t, g);
    const score = c * c + t * t + g * g + sets * 7;
    if (score > best) best = score;
  });
  return best;
}

function assignWilds(
  compass: number,
  tablet: number,
  gear: number,
  remaining: number,
  callback: (c: number, t: number, g: number) => void,
): void {
  if (remaining === 0) {
    callback(compass, tablet, gear);
    return;
  }
  assignWilds(compass + 1, tablet, gear, remaining - 1, callback);
  assignWilds(compass, tablet + 1, gear, remaining - 1, callback);
  assignWilds(compass, tablet, gear + 1, remaining - 1, callback);
}

function scoreScience(
  state: GameState,
  player: PlayerState,
  leftPlayer: PlayerState,
  rightPlayer: PlayerState,
): number {
  const counts = collectScienceSymbols(state, player, leftPlayer, rightPlayer);
  return computeScienceScore(
    counts.compass,
    counts.tablet,
    counts.gear,
    counts.wilds,
  );
}

function collectScienceSymbols(
  _state: GameState,
  player: PlayerState,
  _leftPlayer: PlayerState,
  _rightPlayer: PlayerState,
): { compass: number; tablet: number; gear: number; wilds: number } {
  let compass = 0;
  let tablet = 0;
  let gear = 0;
  let wilds = 0;

  for (const cardId of player.tableau) {
    const card = getCardById(cardId);
    if (card.effect.type === "science") {
      addSymbol(card.effect.symbol);
    }
    if (
      card.effect.type === "guild" &&
      card.effect.scoring.kind === "scienceWild"
    ) {
      wilds++;
    }
  }

  const wonder = getWonderById(player.wonderId);
  for (let i = 0; i < player.wonderStagesBuilt; i++) {
    const effect = wonder.stages[i].effect;
    if (effect.type === "science") {
      addSymbol(effect.symbol);
    }
  }

  return { compass, tablet, gear, wilds };

  function addSymbol(symbol: Science): void {
    switch (symbol) {
      case "compass":
        compass++;
        break;
      case "tablet":
        tablet++;
        break;
      case "gear":
        gear++;
        break;
      case "wild":
        wilds++;
        break;
    }
  }
}

function scoreCommerce(
  player: PlayerState,
  leftPlayer: PlayerState,
  rightPlayer: PlayerState,
): number {
  let points = 0;
  for (const cardId of player.tableau) {
    const card = getCardById(cardId);
    if (card.effect.type === "endGamePoints") {
      points += computeEndGamePoints(
        card.effect,
        player,
        leftPlayer,
        rightPlayer,
      );
    }
  }
  return points;
}

function computeEndGamePoints(
  effect: {
    type: "endGamePoints";
    colour: CardColour | "wonderStages";
    self: number;
    neighbors: number;
  },
  player: PlayerState,
  leftPlayer: PlayerState,
  rightPlayer: PlayerState,
): number {
  if (effect.colour === "wonderStages") {
    return (
      player.wonderStagesBuilt * effect.self +
      (leftPlayer.wonderStagesBuilt + rightPlayer.wonderStagesBuilt) *
        effect.neighbors
    );
  }
  const selfCount = countPlayerCards(player, effect.colour);
  const neighborCount =
    countPlayerCards(leftPlayer, effect.colour) +
    countPlayerCards(rightPlayer, effect.colour);
  return selfCount * effect.self + neighborCount * effect.neighbors;
}

function scoreGuilds(
  player: PlayerState,
  leftPlayer: PlayerState,
  rightPlayer: PlayerState,
): number {
  let points = 0;
  for (const cardId of player.tableau) {
    const card = getCardById(cardId);
    if (card.effect.type === "guild") {
      const scoring = card.effect.scoring;
      switch (scoring.kind) {
        case "countNeighbourCards":
          points +=
            (countPlayerCards(leftPlayer, scoring.colour) +
              countPlayerCards(rightPlayer, scoring.colour)) *
            scoring.perCard;
          break;
        case "countNeighbourWonderStages":
          points +=
            (leftPlayer.wonderStagesBuilt + rightPlayer.wonderStagesBuilt) *
            scoring.perStage;
          break;
        case "countOwnCards":
          for (const colour of scoring.colours) {
            points += countPlayerCards(player, colour) * scoring.perCard;
          }
          break;
        case "scienceWild":
          break;
      }
    }
  }
  return points;
}
