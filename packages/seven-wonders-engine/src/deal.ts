import { getCardsForAge } from "./config/cards.js";
import type { GameState, RNG } from "./types.js";

export function shuffle<T>(arr: readonly T[], rng: RNG): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function dealAge(state: GameState, age: 1 | 2 | 3, rng: RNG): GameState {
  const playerCount = state.turnOrder.length;
  const cards = getCardsForAge(age, playerCount);

  let deckIds: string[];

  if (age === 3) {
    const nonPurple = cards.filter((c) => c.colour !== "purple");
    const purples = cards.filter((c) => c.colour === "purple");
    const shuffledPurples = shuffle(purples, rng);
    const selectedPurples = shuffledPurples.slice(0, playerCount + 2);
    const combined = [...nonPurple, ...selectedPurples];
    deckIds = shuffle(
      combined.map((c) => c.id),
      rng,
    );
  } else {
    deckIds = shuffle(
      cards.map((c) => c.id),
      rng,
    );
  }

  const handSize = 7;
  const totalNeeded = playerCount * handSize;

  const dealCards = deckIds.slice(0, totalNeeded);
  const leftover = deckIds.slice(totalNeeded);

  const hands: Record<string, string[]> = {};
  for (let i = 0; i < playerCount; i++) {
    const playerId = state.turnOrder[i];
    hands[playerId] = dealCards.slice(i * handSize, (i + 1) * handSize);
  }

  const direction = age === 1 ? "LEFT" : age === 2 ? "RIGHT" : "LEFT";

  const ageDecks = [...state.ageDecks] as [string[], string[], string[]];
  ageDecks[age - 1] = leftover;

  return {
    ...state,
    age,
    phase: "DRAFTING",
    passDirection: direction,
    hands,
    pendingPicks: {},
    ageDecks,
  };
}
