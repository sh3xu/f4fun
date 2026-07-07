import { AVATARS } from "@/lib/avatars";
import { cn } from "@/lib/cn";
import { Avatar } from "./Avatar";

interface PlayerBadgeProps {
  name: string;
  avatarId?: string;
  isHost?: boolean;
  isOnline?: boolean;
  className?: string;
}

export function PlayerBadge({
  name,
  avatarId = AVATARS[0].id,
  isHost,
  isOnline,
  className,
}: PlayerBadgeProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <Avatar avatarId={avatarId} size="sm" />
        {isOnline !== undefined && (
          <div
            className={cn(
              "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
              isOnline ? "bg-green-500" : "bg-gray-400",
            )}
          />
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">{name}</span>
        {isHost && (
          <span className="text-xs text-blue-600 font-semibold">Host</span>
        )}
      </div>
    </div>
  );
}
