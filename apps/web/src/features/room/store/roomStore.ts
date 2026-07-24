import type { GameType } from "@f4fun/shared-types";
import { create } from "zustand";

export interface RoomPlayer {
  id: string;
  name: string;
  token: string;
  isHost: boolean;
  isConnected: boolean;
  isBot?: boolean;
}

interface RoomStore {
  roomId: string | null;
  roomCode: string | null;
  gameId: string | null;
  gameType: GameType;
  players: RoomPlayer[];
  myPlayerId: string | null;
  myName: string | null;
  myToken: string | null;
  myPlayerSecret: string | null;
  isConnected: boolean;

  setRoom: (
    roomId: string,
    roomCode: string,
    players: RoomPlayer[],
    gameType?: GameType,
  ) => void;
  setMyIdentity: (
    playerId: string,
    name: string,
    token: string,
    playerSecret: string,
  ) => void;
  setGameId: (gameId: string) => void;
  setGameType: (gameType: GameType) => void;
  setRoomId: (roomId: string) => void;
  setMyPlayerId: (playerId: string) => void;
  setMyPlayerSecret: (playerSecret: string) => void;
  addPlayer: (player: RoomPlayer) => void;
  updatePlayerConnection: (playerId: string, isConnected: boolean) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  roomId: null,
  roomCode: null,
  gameId: null,
  gameType: "monopoly",
  players: [],
  myPlayerId: null,
  myName: null,
  myToken: null,
  myPlayerSecret: null,
  isConnected: false,

  setRoom: (roomId, roomCode, players, gameType) => {
    set((s) => ({
      roomId,
      roomCode,
      players,
      gameType: gameType ?? s.gameType,
    }));
  },

  setMyIdentity: (playerId, name, token, playerSecret) => {
    set({
      myPlayerId: playerId,
      myName: name,
      myToken: token,
      myPlayerSecret: playerSecret,
    });
  },

  setGameId: (gameId) => {
    set({ gameId });
  },

  setGameType: (gameType) => {
    set({ gameType });
  },

  setRoomId: (roomId) => {
    set({ roomId });
  },

  setMyPlayerId: (playerId) => {
    set({ myPlayerId: playerId });
  },

  setMyPlayerSecret: (playerSecret) => {
    set({ myPlayerSecret: playerSecret });
  },

  addPlayer: (player) => {
    set((s) => {
      const exists = s.players.some((p) => p.id === player.id);
      if (exists) {
        return {
          players: s.players.map((p) =>
            p.id === player.id ? { ...p, ...player, isConnected: true } : p,
          ),
        };
      }
      return { players: [...s.players, player] };
    });
  },

  updatePlayerConnection: (playerId, isConnected) => {
    set((s) => ({
      players: s.players.map((p) =>
        p.id === playerId ? { ...p, isConnected } : p,
      ),
    }));
  },

  setConnected: (connected) => {
    set({ isConnected: connected });
  },

  reset: () => {
    set({
      roomId: null,
      roomCode: null,
      gameId: null,
      gameType: "monopoly",
      players: [],
      myPlayerId: null,
      myName: null,
      myToken: null,
      myPlayerSecret: null,
      isConnected: false,
    });
  },
}));
