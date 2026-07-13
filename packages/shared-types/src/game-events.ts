import { z } from "zod";

export const GameRejoinSchema = z.object({
  roomId: z.string(),
  playerId: z.string().min(1),
  playerSecret: z.string().min(1),
});

export const GameRollDiceSchema = z.object({
  roomId: z.string(),
});

export const GameBuyPropertySchema = z.object({
  roomId: z.string(),
});

export const GameDeclinePropertySchema = z.object({
  roomId: z.string(),
});

export const GameStartAuctionSchema = z.object({
  roomId: z.string(),
});

export const GameStartOwnerAuctionSchema = z.object({
  roomId: z.string(),
  position: z.number().int().min(0).max(39),
});

export const GamePlaceBidSchema = z.object({
  roomId: z.string(),
  amount: z.number().int().positive(),
});

export const GamePassAuctionSchema = z.object({
  roomId: z.string(),
});

export const GameEndTurnSchema = z.object({
  roomId: z.string(),
});

export const GamePayJailFineSchema = z.object({
  roomId: z.string(),
});

export const GameUseGoojfCardSchema = z.object({
  roomId: z.string(),
});

export const GameRollForJailSchema = z.object({
  roomId: z.string(),
});

export const GameAcknowledgeCardSchema = z.object({
  roomId: z.string(),
});

export const GameBuildHouseSchema = z.object({
  roomId: z.string(),
  position: z.number().int().min(0).max(39),
});

export const GameSellHouseSchema = z.object({
  roomId: z.string(),
  position: z.number().int().min(0).max(39),
});

export const GameBuildHotelSchema = z.object({
  roomId: z.string(),
  position: z.number().int().min(0).max(39),
});

export const GameSellHotelSchema = z.object({
  roomId: z.string(),
  position: z.number().int().min(0).max(39),
});

export const GameMortgagePropertySchema = z.object({
  roomId: z.string(),
  position: z.number().int().min(0).max(39),
});

export const GameUnmortgagePropertySchema = z.object({
  roomId: z.string(),
  position: z.number().int().min(0).max(39),
});

export const TradeOfferSchema = z.object({
  cash: z.number().int().min(0),
  positions: z.array(z.number().int().min(0).max(39)),
  goojfCards: z.number().int().min(0).max(2),
});

export const GameProposeTradeSchema = z.object({
  roomId: z.string(),
  tradeId: z.string(),
  toPlayerId: z.string(),
  offer: TradeOfferSchema,
  request: TradeOfferSchema,
});

export const GameAcceptTradeSchema = z.object({
  roomId: z.string(),
  tradeId: z.string(),
});

export const GameRejectTradeSchema = z.object({
  roomId: z.string(),
  tradeId: z.string(),
});

export const GameDiceRolledSchema = z.object({
  playerId: z.string(),
  dice: z.tuple([
    z.number().int().min(1).max(6),
    z.number().int().min(1).max(6),
  ]),
  newPosition: z.number().int().min(0).max(39),
});

export const GamePassedGoSchema = z.object({
  playerId: z.string(),
  amount: z.number().int(),
});

export const GamePropertyBoughtSchema = z.object({
  playerId: z.string(),
  position: z.number().int().min(0).max(39),
  price: z.number().int(),
});

export const GamePropertyDeclinedSchema = z.object({
  playerId: z.string(),
  position: z.number().int().min(0).max(39),
});

export const GameAuctionStartedSchema = z.object({
  position: z.number().int().min(0).max(39),
  kind: z.enum(["bank", "owner"]),
  sellerId: z.string().nullable(),
});

export const GameAuctionBidSchema = z.object({
  playerId: z.string(),
  amount: z.number().int(),
});

export const GameAuctionPassedSchema = z.object({
  playerId: z.string(),
});

export const GameAuctionAutofoldedSchema = z.object({
  playerId: z.string(),
});

export const GameAuctionWonSchema = z.object({
  playerId: z.string(),
  position: z.number().int().min(0).max(39),
  amount: z.number().int(),
});

export const GameAuctionCancelledSchema = z.object({
  position: z.number().int().min(0).max(39),
});

export const GameTradeProposedSchema = z.object({
  tradeId: z.string(),
  fromPlayerId: z.string(),
  toPlayerId: z.string(),
});

export const GameTradeRejectedSchema = z.object({
  tradeId: z.string(),
});

export const GameRentPaidSchema = z.object({
  payerId: z.string(),
  ownerId: z.string(),
  position: z.number().int().min(0).max(39),
  amount: z.number().int(),
});

export const GameTaxPaidSchema = z.object({
  playerId: z.string(),
  amount: z.number().int(),
});

export const GameSentToJailSchema = z.object({
  playerId: z.string(),
});

export const GameReleasedFromJailSchema = z.object({
  playerId: z.string(),
  method: z.enum(["fine", "card", "doubles"]),
});

export const GameJailTurnFailedSchema = z.object({
  playerId: z.string(),
  turnsInJail: z.number().int(),
});

export const GameCardDrawnSchema = z.object({
  playerId: z.string(),
  deck: z.enum(["chance", "community_chest"]),
  cardId: z.string(),
});

export const GameCardAppliedSchema = z.object({
  playerId: z.string(),
  cardId: z.string(),
});

export const GameHouseBuiltSchema = z.object({
  playerId: z.string(),
  position: z.number().int().min(0).max(39),
});

export const GameHotelBuiltSchema = z.object({
  playerId: z.string(),
  position: z.number().int().min(0).max(39),
});

export const GameHouseSoldSchema = z.object({
  playerId: z.string(),
  position: z.number().int().min(0).max(39),
});

export const GameHotelSoldSchema = z.object({
  playerId: z.string(),
  position: z.number().int().min(0).max(39),
});

export const GamePropertyMortgagedSchema = z.object({
  playerId: z.string(),
  position: z.number().int().min(0).max(39),
  mortgageValue: z.number().int(),
});

export const GamePropertyUnmortgagedSchema = z.object({
  playerId: z.string(),
  position: z.number().int().min(0).max(39),
  cost: z.number().int(),
});

export const GameTradeCompletedSchema = z.object({
  initiatorId: z.string(),
  partnerId: z.string(),
});

export const GamePlayerBankruptSchema = z.object({
  playerId: z.string(),
  creditorId: z.string().nullable(),
});

export const GameTurnAdvancedSchema = z.object({
  playerId: z.string(),
});

export const GameWonSchema = z.object({
  winnerId: z.string(),
});

export const GameErrorSchema = z.object({
  message: z.string(),
});

export type GameRejoinPayload = z.infer<typeof GameRejoinSchema>;
export type GameRollDicePayload = z.infer<typeof GameRollDiceSchema>;
export type GameBuyPropertyPayload = z.infer<typeof GameBuyPropertySchema>;
export type GameDeclinePropertyPayload = z.infer<
  typeof GameDeclinePropertySchema
>;
export type GameStartAuctionPayload = z.infer<typeof GameStartAuctionSchema>;
export type GameStartOwnerAuctionPayload = z.infer<
  typeof GameStartOwnerAuctionSchema
>;
export type GamePlaceBidPayload = z.infer<typeof GamePlaceBidSchema>;
export type GamePassAuctionPayload = z.infer<typeof GamePassAuctionSchema>;
export type GameEndTurnPayload = z.infer<typeof GameEndTurnSchema>;
export type GamePayJailFinePayload = z.infer<typeof GamePayJailFineSchema>;
export type GameUseGoojfCardPayload = z.infer<typeof GameUseGoojfCardSchema>;
export type GameRollForJailPayload = z.infer<typeof GameRollForJailSchema>;
export type GameAcknowledgeCardPayload = z.infer<
  typeof GameAcknowledgeCardSchema
>;
export type GameBuildHousePayload = z.infer<typeof GameBuildHouseSchema>;
export type GameSellHousePayload = z.infer<typeof GameSellHouseSchema>;
export type GameBuildHotelPayload = z.infer<typeof GameBuildHotelSchema>;
export type GameSellHotelPayload = z.infer<typeof GameSellHotelSchema>;
export type GameMortgagePropertyPayload = z.infer<
  typeof GameMortgagePropertySchema
>;
export type GameUnmortgagePropertyPayload = z.infer<
  typeof GameUnmortgagePropertySchema
>;
export type TradeOffer = z.infer<typeof TradeOfferSchema>;
export type GameProposeTradePayload = z.infer<typeof GameProposeTradeSchema>;
export type GameAcceptTradePayload = z.infer<typeof GameAcceptTradeSchema>;
export type GameRejectTradePayload = z.infer<typeof GameRejectTradeSchema>;
export type GameDiceRolledPayload = z.infer<typeof GameDiceRolledSchema>;
export type GamePassedGoPayload = z.infer<typeof GamePassedGoSchema>;
export type GamePropertyBoughtPayload = z.infer<
  typeof GamePropertyBoughtSchema
>;
export type GamePropertyDeclinedPayload = z.infer<
  typeof GamePropertyDeclinedSchema
>;
export type GameAuctionStartedPayload = z.infer<
  typeof GameAuctionStartedSchema
>;
export type GameAuctionBidPayload = z.infer<typeof GameAuctionBidSchema>;
export type GameAuctionPassedPayload = z.infer<typeof GameAuctionPassedSchema>;
export type GameAuctionAutofoldedPayload = z.infer<
  typeof GameAuctionAutofoldedSchema
>;
export type GameAuctionWonPayload = z.infer<typeof GameAuctionWonSchema>;
export type GameAuctionCancelledPayload = z.infer<
  typeof GameAuctionCancelledSchema
>;
export type GameTradeProposedPayload = z.infer<typeof GameTradeProposedSchema>;
export type GameTradeRejectedPayload = z.infer<typeof GameTradeRejectedSchema>;
export type GameRentPaidPayload = z.infer<typeof GameRentPaidSchema>;
export type GameTaxPaidPayload = z.infer<typeof GameTaxPaidSchema>;
export type GameSentToJailPayload = z.infer<typeof GameSentToJailSchema>;
export type GameReleasedFromJailPayload = z.infer<
  typeof GameReleasedFromJailSchema
>;
export type GameJailTurnFailedPayload = z.infer<
  typeof GameJailTurnFailedSchema
>;
export type GameCardDrawnPayload = z.infer<typeof GameCardDrawnSchema>;
export type GameCardAppliedPayload = z.infer<typeof GameCardAppliedSchema>;
export type GameHouseBuiltPayload = z.infer<typeof GameHouseBuiltSchema>;
export type GameHotelBuiltPayload = z.infer<typeof GameHotelBuiltSchema>;
export type GameHouseSoldPayload = z.infer<typeof GameHouseSoldSchema>;
export type GameHotelSoldPayload = z.infer<typeof GameHotelSoldSchema>;
export type GamePropertyMortgagedPayload = z.infer<
  typeof GamePropertyMortgagedSchema
>;
export type GamePropertyUnmortgagedPayload = z.infer<
  typeof GamePropertyUnmortgagedSchema
>;
export type GameTradeCompletedPayload = z.infer<
  typeof GameTradeCompletedSchema
>;
export type GamePlayerBankruptPayload = z.infer<
  typeof GamePlayerBankruptSchema
>;
export type GameTurnAdvancedPayload = z.infer<typeof GameTurnAdvancedSchema>;
export type GameWonPayload = z.infer<typeof GameWonSchema>;
export type GameErrorPayload = z.infer<typeof GameErrorSchema>;
