import {
  passAuction,
  placeBid,
  startBankAuction,
  startOwnerAuction,
} from "./auction.js";
import { sellPropertyToBank } from "./bankSale.js";
import { buildHotel, buildHouse, sellHotel, sellHouse } from "./building.js";
import { applyCardEffect, lookupCard, MOVEMENT_EFFECT_KINDS } from "./cards.js";
import { JAIL_POSITION } from "./config/board.js";
import { forceSettleDebt, tryResolveRaiseCash } from "./debt.js";
import { diceSum, rollDice } from "./dice.js";
import { payJailFine, rollForJail, spendGoojfCard } from "./jail.js";
import { mortgageProperty, unmortgageProperty } from "./mortgage.js";
import { applyMove } from "./movement.js";
import { phaseAfterDiceAction } from "./phase.js";
import { buyProperty, canBuyProperty } from "./property.js";
import {
  type ResolveLandingOptions,
  resolveLanding,
} from "./resolveLanding.js";
import { acceptTrade, proposeTrade, rejectTrade } from "./trade.js";
import { advanceTurn, getActivePlayer } from "./turn.js";
import type {
  ApplyResult,
  GameAction,
  GameEvent,
  GameState,
  PlayerId,
  RNG,
} from "./types.js";

function managementPhaseOk(phase: GameState["phase"]): boolean {
  return (
    phase === "PRE_ROLL" ||
    phase === "END_TURN" ||
    phase === "JAIL_DECISION" ||
    phase === "RAISE_CASH"
  );
}

function afterCashAffectingAction(
  state: GameState,
  events: GameEvent[],
  rng: RNG,
): void {
  tryResolveRaiseCash(state, events, rng);
}

/**
 * @param actorId - Player performing the action. Defaults to the active turn player.
 *   Required for auction bids/passes and trade accept/reject by non-active players.
 */
export function applyAction(
  state: GameState,
  action: GameAction,
  rng: RNG = Math.random,
  actorId?: PlayerId,
): ApplyResult {
  const activePlayerId = getActivePlayer(state);
  const playerId = actorId ?? activePlayerId;

  if (!playerId) {
    return { state, events: [], error: "No active player" };
  }

  // NOTE: A pending trade freezes the turn — only accept/reject may proceed.
  if (
    state.pendingTrades.length > 0 &&
    action.type !== "ACCEPT_TRADE" &&
    action.type !== "REJECT_TRADE"
  ) {
    return {
      state,
      events: [],
      error: "Resolve pending trade first",
    };
  }

  const events: GameEvent[] = [];

  try {
    switch (action.type) {
      case "ROLL_DICE": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (state.phase !== "PRE_ROLL") {
          return { state, events: [], error: "Cannot roll dice now" };
        }

        const { dice, isDoubles } = rollDice(rng);
        const spaces = diceSum(dice);

        state.lastDice = dice;

        if (isDoubles) {
          state.doublesCount++;
          if (state.doublesCount === 3) {
            const player = state.players[activePlayerId];
            player.position = JAIL_POSITION;
            player.isInJail = true;
            player.jailState = {
              turnsInJail: 0,
              hasGetOutOfJailFreeCard: false,
            };
            state.doublesCount = 0;

            events.push({ type: "SENT_TO_JAIL", playerId: activePlayerId });
            events.push({
              type: "DICE_ROLLED",
              playerId: activePlayerId,
              dice,
              newPosition: JAIL_POSITION,
            });

            state.phase = "END_TURN";
            return { state, events };
          }
        }

        const moveEvents = applyMove(state, activePlayerId, spaces);
        events.push(...moveEvents);

        const player = state.players[activePlayerId];
        events.push({
          type: "DICE_ROLLED",
          playerId: activePlayerId,
          dice,
          newPosition: player.position,
        });

        events.push(
          ...resolveLanding(state, activePlayerId, spaces, {
            allowDoublesReroll: true,
            rng,
          }),
        );
        return { state, events };
      }

      case "BUY_PROPERTY": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (state.phase !== "BUY_OR_DECLINE") {
          return { state, events: [], error: "Cannot buy property now" };
        }

        const player = state.players[activePlayerId];
        const { canBuy, reason } = canBuyProperty(
          state,
          activePlayerId,
          player.position,
        );

        if (!canBuy) {
          return { state, events: [], error: reason || "Cannot buy property" };
        }

        const buyEvents = buyProperty(state, activePlayerId, player.position);
        events.push(...buyEvents);

        state.phase = phaseAfterDiceAction(state);

        return { state, events };
      }

      case "DECLINE_PROPERTY": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (state.phase !== "BUY_OR_DECLINE") {
          return { state, events: [], error: "Cannot decline property now" };
        }

        const player = state.players[activePlayerId];
        events.push({
          type: "PROPERTY_DECLINED",
          playerId: activePlayerId,
          position: player.position,
        });

        state.phase = phaseAfterDiceAction(state);

        return { state, events };
      }

      case "START_AUCTION": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        const player = state.players[activePlayerId];
        const result = startBankAuction(state, player.position);
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        return { state, events };
      }

      case "START_OWNER_AUCTION": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (!managementPhaseOk(state.phase)) {
          return { state, events: [], error: "Cannot start owner auction now" };
        }
        const result = startOwnerAuction(state, playerId, action.position);
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        return { state, events };
      }

      case "PLACE_BID": {
        const result = placeBid(state, playerId, action.amount);
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        afterCashAffectingAction(state, events, rng);
        return { state, events };
      }

      case "PASS_AUCTION": {
        const result = passAuction(state, playerId);
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        afterCashAffectingAction(state, events, rng);
        return { state, events };
      }

      case "BUILD_HOUSE": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (!managementPhaseOk(state.phase)) {
          return { state, events: [], error: "Cannot build now" };
        }
        const result = buildHouse(state, playerId, action.position);
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        afterCashAffectingAction(state, events, rng);
        return { state, events };
      }

      case "SELL_HOUSE": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (!managementPhaseOk(state.phase)) {
          return { state, events: [], error: "Cannot sell house now" };
        }
        const result = sellHouse(state, playerId, action.position);
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        afterCashAffectingAction(state, events, rng);
        return { state, events };
      }

      case "BUILD_HOTEL": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (!managementPhaseOk(state.phase)) {
          return { state, events: [], error: "Cannot build hotel now" };
        }
        const result = buildHotel(state, playerId, action.position);
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        afterCashAffectingAction(state, events, rng);
        return { state, events };
      }

      case "SELL_HOTEL": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (!managementPhaseOk(state.phase)) {
          return { state, events: [], error: "Cannot sell hotel now" };
        }
        const result = sellHotel(state, playerId, action.position);
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        afterCashAffectingAction(state, events, rng);
        return { state, events };
      }

      case "MORTGAGE_PROPERTY": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (!managementPhaseOk(state.phase)) {
          return { state, events: [], error: "Cannot mortgage now" };
        }
        const result = mortgageProperty(state, playerId, action.position);
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        afterCashAffectingAction(state, events, rng);
        return { state, events };
      }

      case "UNMORTGAGE_PROPERTY": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (!managementPhaseOk(state.phase)) {
          return { state, events: [], error: "Cannot unmortgage now" };
        }
        const result = unmortgageProperty(state, playerId, action.position);
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        afterCashAffectingAction(state, events, rng);
        return { state, events };
      }

      case "SELL_PROPERTY_TO_BANK": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (!managementPhaseOk(state.phase)) {
          return { state, events: [], error: "Cannot sell to bank now" };
        }
        const result = sellPropertyToBank(state, playerId, action.position);
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        afterCashAffectingAction(state, events, rng);
        return { state, events };
      }

      case "PROPOSE_TRADE": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (!managementPhaseOk(state.phase)) {
          return { state, events: [], error: "Cannot trade now" };
        }
        const result = proposeTrade(
          state,
          playerId,
          action.tradeId,
          action.toPlayerId,
          action.offer,
          action.request,
        );
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        return { state, events };
      }

      case "ACCEPT_TRADE": {
        const result = acceptTrade(state, playerId, action.tradeId);
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        afterCashAffectingAction(state, events, rng);
        return { state, events };
      }

      case "REJECT_TRADE": {
        const result = rejectTrade(state, playerId, action.tradeId);
        if (result.error) {
          return { state, events: [], error: result.error };
        }
        events.push(...result.events);
        return { state, events };
      }

      case "PAY_JAIL_FINE": {
        if (!activePlayerId) {
          return { state, events: [], error: "No active player" };
        }
        return payJailFine(state, playerId, activePlayerId);
      }

      case "USE_GOOJF_CARD": {
        if (!activePlayerId) {
          return { state, events: [], error: "No active player" };
        }
        return spendGoojfCard(state, playerId, activePlayerId);
      }

      case "ROLL_FOR_JAIL": {
        if (!activePlayerId) {
          return { state, events: [], error: "No active player" };
        }
        return rollForJail(state, playerId, activePlayerId, rng);
      }

      case "FORCE_SETTLE_DEBT": {
        const debtorId = state.pendingDebt?.playerId;
        if (!debtorId || playerId !== debtorId) {
          return { state, events: [], error: "No debt to settle" };
        }
        events.push(...forceSettleDebt(state, rng));
        return { state, events };
      }

      case "END_TURN": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (state.phase !== "END_TURN") {
          return { state, events: [], error: "Cannot end turn now" };
        }

        const turnEvents = advanceTurn(state);
        events.push(...turnEvents);

        return { state, events };
      }

      case "ACKNOWLEDGE_CARD": {
        if (playerId !== activePlayerId) {
          return { state, events: [], error: "Not your turn" };
        }
        if (state.phase !== "CARD_DRAWN") {
          return { state, events: [], error: "No card to acknowledge" };
        }
        if (!state.pendingCard) {
          return { state, events: [], error: "No pending card" };
        }

        const { deck: deckKey, cardId } = state.pendingCard;
        const card = lookupCard(deckKey, cardId);
        if (!card) {
          return { state, events: [], error: "Unknown card id" };
        }

        state.pendingCard = null;
        events.push({ type: "CARD_APPLIED", playerId: activePlayerId, cardId });

        const cardEvents = applyCardEffect(
          state,
          activePlayerId,
          card,
          deckKey,
          rng,
        );
        events.push(...cardEvents);

        if (state.winnerId !== null) {
          return { state, events };
        }

        if (MOVEMENT_EFFECT_KINDS.has(card.effect.kind)) {
          const spaces = state.lastDice ? diceSum(state.lastDice) : 0;
          const landingOptions: ResolveLandingOptions = {
            allowDoublesReroll: state.allowDoublesReroll,
            rng,
          };
          if (card.effect.kind === "move_to_nearest") {
            if (card.effect.tileType === "railroad") {
              landingOptions.rentMultiplier = 2;
            } else {
              landingOptions.utilityRentMode = "roll_ten_times";
            }
          }
          events.push(
            ...resolveLanding(state, activePlayerId, spaces, landingOptions),
          );
        } else if (card.effect.kind === "go_to_jail") {
          state.phase = "END_TURN";
        } else if (state.phase === "CARD_DRAWN") {
          if (state.players[activePlayerId]?.isBankrupt) {
            state.phase = "END_TURN";
          } else {
            state.phase = phaseAfterDiceAction(state);
          }
        }

        return { state, events };
      }

      default:
        return { state, events: [], error: "Unknown action type" };
    }
  } catch (err) {
    return { state, events: [], error: String(err) };
  }
}
