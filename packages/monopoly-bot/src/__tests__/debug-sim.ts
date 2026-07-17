import { runHeadlessGame, seededRng } from "../index.js";
import { expertStrategy } from "../strategy/expertStrategy.js";

const count = 4;
const players = Array.from({ length: count }, (_, i) => ({
  id: `p${i + 1}`,
  name: `Bot ${i + 1}`,
  token: `memo_${(i % 8) + 1}`,
}));
const strategies = new Map(players.map((p) => [p.id, expertStrategy]));

const result = runHeadlessGame(players, strategies, seededRng(1400), "debug");
console.log({
  turns: result.turns,
  winnerId: result.winnerId,
  phase: result.state.phase,
  cash: Object.fromEntries(
    Object.entries(result.state.players).map(([id, p]) => [id, p.cash]),
  ),
  bankrupt: Object.fromEntries(
    Object.entries(result.state.players).map(([id, p]) => [id, p.isBankrupt]),
  ),
});
