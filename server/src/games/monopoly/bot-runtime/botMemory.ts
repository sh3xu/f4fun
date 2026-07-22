import {
  BotPlayer,
  expertStrategy,
  personalityFromPlayerId,
} from "@f4fun/monopoly-bot";

const botPlayers = new Map<string, BotPlayer>();

export function getBotPlayer(playerId: string): BotPlayer {
  let bot = botPlayers.get(playerId);
  if (!bot) {
    bot = new BotPlayer(expertStrategy, personalityFromPlayerId(playerId));
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
  const bot = botPlayers.get(fromPlayerId);
  if (!bot) return;
  bot.rememberRejectedTrade(fingerprint, partnerCondition);
}

export function clearBotPlayersForTests(): void {
  botPlayers.clear();
}
