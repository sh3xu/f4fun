import { type Document, model, Schema } from "mongoose";

export type RoomStatus = "lobby" | "playing" | "finished";

export interface IRoomPlayer {
  playerId: string;
  name: string;
  token: string;
  playerSecret: string;
  isHost: boolean;
  isConnected: boolean;
  isBot: boolean;
  joinedAt: Date;
}

export type RoomGameType = "monopoly" | "sevenWonders";

export interface IRoom extends Document {
  roomId: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  players: IRoomPlayer[];
  gameId: string | null;
  gameType: RoomGameType;
  createdAt: Date;
  updatedAt: Date;
}

const RoomPlayerSchema = new Schema<IRoomPlayer>(
  {
    playerId: { type: String, required: true },
    name: { type: String, required: true },
    token: { type: String, required: true },
    playerSecret: { type: String, required: true },
    isHost: { type: Boolean, default: false },
    isConnected: { type: Boolean, default: true },
    isBot: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const RoomSchema = new Schema<IRoom>(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    hostId: { type: String, required: true },
    status: {
      type: String,
      enum: ["lobby", "playing", "finished"],
      default: "lobby",
    },
    players: [RoomPlayerSchema],
    gameId: { type: String, default: null },
    gameType: {
      type: String,
      enum: ["monopoly", "sevenWonders"],
      default: "monopoly",
    },
  },
  { timestamps: true },
);

export const RoomModel = model<IRoom>("Room", RoomSchema);
