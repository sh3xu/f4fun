import type { GameAction } from "@f4fun/monopoly-engine";
import type {
  ScoredOption,
  StrategyContext,
  StrategyProfile,
} from "./types.js";

/** Test baseline: always buy, never trade, minimal management. */
export const baselineStrategy: StrategyProfile = {
  id: "baseline",
  minimumCashBuffer: () => 50,
  generateTradeProposals: () => [],
  scoreOptions(ctx: StrategyContext): ScoredOption[] {
    const options: ScoredOption[] = [];

    for (const action of ctx.legalActions) {
      switch (action.type) {
        case "BUY_PROPERTY":
          options.push({
            action,
            score: 1000,
            reasoning: "Always buy",
          });
          break;
        case "ROLL_DICE":
        case "ACKNOWLEDGE_CARD":
          options.push({ action, score: 100, reasoning: "Continue turn" });
          break;
        case "DECLINE_PROPERTY":
          options.push({ action, score: 1, reasoning: "Decline" });
          break;
        case "END_TURN":
          options.push({ action, score: 50, reasoning: "End turn" });
          break;
        case "REJECT_TRADE":
          options.push({ action, score: 100, reasoning: "Reject trade" });
          break;
        case "PASS_AUCTION":
          options.push({ action, score: 10, reasoning: "Pass auction" });
          break;
        case "PAY_JAIL_FINE":
          options.push({ action, score: 20, reasoning: "Pay jail fine" });
          break;
        case "ROLL_FOR_JAIL":
          options.push({ action, score: 5, reasoning: "Roll for jail" });
          break;
        case "FORCE_SETTLE_DEBT":
          options.push({ action, score: 100, reasoning: "Settle debt" });
          break;
        case "SELL_HOUSE":
        case "SELL_HOTEL":
          // NOTE: Issue #52 — demolish buildings before mortgage / bank sale.
          options.push({
            action,
            score: 120,
            reasoning: "Sell buildings to pay debt",
          });
          break;
        case "MORTGAGE_PROPERTY":
        case "SELL_PROPERTY_TO_BANK":
          options.push({
            action,
            score: 80,
            reasoning: "Liquidate to pay debt",
          });
          break;
        default:
          break;
      }
    }

    return options;
  },
};

export function pickBaselineOption(
  options: ScoredOption[],
  legalActions: GameAction[],
): ScoredOption | null {
  const legalKeys = new Set(legalActions.map((a) => JSON.stringify(a)));
  const valid = options.filter((o) => legalKeys.has(JSON.stringify(o.action)));
  if (valid.length === 0) return null;
  return valid.reduce((best, cur) => (cur.score > best.score ? cur : best));
}
