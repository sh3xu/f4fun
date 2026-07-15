import { clearAllRoomTimers } from "../games/monopoly/DeadlineTimers.js";
import { deleteGameEventsByRoomId } from "../games/monopoly/GameEventLogger.js";
import { deleteGamesByRoomId } from "../games/monopoly/GameStore.js";
import { cancelAllRoomGraces, hasAnyRoomGrace } from "./DisconnectGrace.js";
import { allPlayersDisconnected, deleteRoom, getRoom } from "./RoomManager.js";

/**
 * Destroy room + game + event data when every seat is disconnected and no
 * reconnect grace timers remain for the room.
 */
export async function destroyRoomIfAbandoned(roomId: string): Promise<boolean> {
  if (hasAnyRoomGrace(roomId)) return false;

  const room = await getRoom(roomId);
  if (!room) return false;

  const abandoned = await allPlayersDisconnected(roomId);
  if (!abandoned) return false;

  cancelAllRoomGraces(roomId);
  clearAllRoomTimers(roomId);

  const gameIds = await deleteGamesByRoomId(roomId);
  await deleteGameEventsByRoomId(roomId);
  await deleteRoom(roomId);

  console.log(
    `[RoomCleanup] Destroyed abandoned room=${roomId} games=${gameIds.length}`,
  );
  return true;
}
