import { checkBankruptcy } from "./bankruptcy.js";
import { autoLiquidateAssets } from "./liquidate.js";
import { applyMove } from "./movement.js";
import { phaseAfterDiceAction } from "./phase.js";
import { resolveLanding } from "./resolveLanding.js";
import type { GameEvent, GameState, PlayerId, RNG } from "./types.js";
import { checkWinCondition } from "./win.js";

export function enterRaiseCashIfNeeded(
  state: GameState,
  playerId: PlayerId,
  creditorId: PlayerId | null,
  events: GameEvent[],
): boolean {
  const player = state.players[playerId];
  if (!player || player.cash >= 0) return false;

  state.pendingDebt = { playerId, creditorId };
  state.phase = "RAISE_CASH";
  events.push({
    type: "DEBT_RAISED",
    playerId,
    creditorId,
    amountNeeded: -player.cash,
  });
  return true;
}

function completePendingJailMove(
  state: GameState,
  playerId: PlayerId,
  pendingJailMove: { dice: [number, number]; spaces: number },
  rng: RNG,
  events: GameEvent[],
): void {
  events.push(...applyMove(state, playerId, pendingJailMove.spaces));
  events.push({
    type: "DICE_ROLLED",
    playerId,
    dice: pendingJailMove.dice,
    newPosition: state.players[playerId]?.position ?? 0,
  });
  events.push(
    ...resolveLanding(state, playerId, pendingJailMove.spaces, {
      allowDoublesReroll: false,
      rng,
    }),
  );
}

export function tryResolveRaiseCash(
  state: GameState,
  events: GameEvent[],
  rng: RNG = Math.random,
): boolean {
  if (state.phase !== "RAISE_CASH" || !state.pendingDebt) return false;

  const { playerId, pendingJailMove } = state.pendingDebt;
  const player = state.players[playerId];
  if (!player || player.cash < 0) return false;

  state.pendingDebt = null;
  events.push({ type: "DEBT_RESOLVED", playerId });

  if (pendingJailMove) {
    completePendingJailMove(state, playerId, pendingJailMove, rng, events);
    if (state.phase === "RAISE_CASH" || state.winnerId !== null) return true;
  }

  if (player.isBankrupt) {
    state.phase = "END_TURN";
    return true;
  }

  if (state.winnerId !== null) return true;

  state.phase = phaseAfterDiceAction(state);
  return true;
}

export function forceSettleDebt(
  state: GameState,
  rng: RNG = Math.random,
): GameEvent[] {
  const events: GameEvent[] = [];
  if (state.phase !== "RAISE_CASH" || !state.pendingDebt) {
    return events;
  }

  const { playerId, creditorId, pendingJailMove } = state.pendingDebt;
  const player = state.players[playerId];
  if (!player) {
    state.pendingDebt = null;
    return events;
  }

  while (player.cash < 0) {
    const before = player.cash;
    const raised = autoLiquidateAssets(state, playerId);
    if (raised.length === 0 || player.cash === before) break;
    events.push(...raised);
  }

  state.pendingDebt = null;

  if (player.cash >= 0) {
    events.push({ type: "DEBT_RESOLVED", playerId });
    if (pendingJailMove) {
      completePendingJailMove(state, playerId, pendingJailMove, rng, events);
      // NOTE: Jail move may re-enter RAISE_CASH for a new debt; leave that alone.
      if (state.phase === "RAISE_CASH" || state.winnerId !== null) {
        return events;
      }
    }
    if (state.winnerId !== null) return events;
    state.phase = player.isBankrupt ? "END_TURN" : phaseAfterDiceAction(state);
    return events;
  }

  events.push(...checkBankruptcy(state, playerId, creditorId));
  events.push(...checkWinCondition(state));

  if (state.winnerId !== null) return events;

  state.phase = player.isBankrupt ? "END_TURN" : phaseAfterDiceAction(state);

  return events;
}
