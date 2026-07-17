import { BotPlayer, expertStrategy } from "@f4fun/monopoly-bot";

const botPlayers = new Map<string, BotPlayer>();

export function getBotPlayer(playerId: string): BotPlayer {
  let bot = botPlayers.get(playerId);
  if (!bot) {
    bot = new BotPlayer(expertStrategy);
    botPlayers.set(playerId, bot);
  }
  return bot;
}

/** When any player rejects a trade, stamp the proposer's bot memory. */
export function rememberRejectedDealForProposer(
  fromPlayerId: string,
  fingerprint: string,
  partnerCondition: string,
): void {
  getBotPlayer(fromPlayerId).rememberRejectedTrade(
    fingerprint,
    partnerCondition,
  );
}

export function clearBotPlayersForTests(): void {
  botPlayers.clear();
}
