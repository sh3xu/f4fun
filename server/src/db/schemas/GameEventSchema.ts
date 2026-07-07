import type { GameEvent } from "@f4fun/monopoly-engine";
import { type Document, model, Schema } from "mongoose";

export interface IGameEvent extends Document {
  gameId: string;
  roomId: string;
  sequence: number;
  turn: number;
  playerId: string;
  action: string;
  events: GameEvent[];
  stateBefore: Record<string, unknown>;
  stateAfter: Record<string, unknown>;
  timestamp: Date;
}

const GameEventSchema = new Schema<IGameEvent>(
  {
    gameId: { type: String, required: true, index: true },
    roomId: { type: String, required: true },
    sequence: { type: Number, required: true },
    turn: { type: Number, required: true },
    playerId: { type: String, required: true },
    action: { type: String, required: true },
    events: [],
    stateBefore: { type: Schema.Types.Mixed, required: true },
    stateAfter: { type: Schema.Types.Mixed, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

GameEventSchema.index({ gameId: 1, sequence: 1 }, { unique: true });
GameEventSchema.index({ gameId: 1, turn: 1 });

export const GameEventModel = model<IGameEvent>("GameEvent", GameEventSchema);
