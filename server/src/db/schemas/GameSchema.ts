import type { GameState } from "@f4fun/monopoly-engine";
import { type Document, model, Schema } from "mongoose";

export interface IGame extends Document {
  gameId: string;
  roomId: string;
  state: GameState;
  turnCount: number;
  startedAt: Date;
  finishedAt: Date | null;
  winnerId: string | null;
  updatedAt: Date;
}

const GameSchema = new Schema<IGame>(
  {
    gameId: { type: String, required: true, unique: true, index: true },
    roomId: { type: String, required: true, index: true },
    state: { type: Schema.Types.Mixed, required: true },
    turnCount: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    winnerId: { type: String, default: null },
  },
  { timestamps: true, minimize: false },
);

export const GameModel = model<IGame>("Game", GameSchema);
