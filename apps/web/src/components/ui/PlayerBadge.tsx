import { getAvatarById } from "@/lib/avatars";
import { cn } from "@/lib/cn";
import { Avatar } from "./Avatar";

interface PlayerBadgeProps {
  name: string;
  avatarId: string;
  isHost?: boolean;
  isOnline?: boolean;
  className?: string;
}

export function PlayerBadge({
  name,
  avatarId,
  isHost,
  isOnline,
  className,
}: PlayerBadgeProps) {
  const resolvedAvatarId = getAvatarById(avatarId).id;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative">
        <Avatar avatarId={resolvedAvatarId} size="sm" />
        {isOnline !== undefined && (
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#131a27]",
              isOnline ? "bg-emerald-500" : "bg-gray-500",
            )}
          />
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-gray-100 truncate">
          {name}
        </span>
        {isHost && (
          <span className="text-[10px] text-[#4fc3f7] font-bold uppercase tracking-wide">
            Host
          </span>
        )}
      </div>
    </div>
  );
}
