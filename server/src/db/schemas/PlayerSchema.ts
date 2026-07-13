import { type Document, model, Schema } from "mongoose";

export interface IPlayer extends Document {
  socketId: string;
  playerId: string;
  name: string;
  token: string;
  playerSecret: string;
  roomId: string;
  isConnected: boolean;
  isHost: boolean;
  lastSeenAt: Date;
}

const PlayerSchema = new Schema<IPlayer>(
  {
    socketId: { type: String, required: true },
    playerId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    token: { type: String, required: true },
    playerSecret: { type: String, required: true },
    roomId: { type: String, required: true, index: true },
    isConnected: { type: Boolean, default: true },
    isHost: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

PlayerSchema.index({ playerId: 1, roomId: 1 }, { unique: true });

export const PlayerModel = model<IPlayer>("Player", PlayerSchema);
