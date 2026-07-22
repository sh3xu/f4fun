import { getAvatarById } from "@/lib/avatars";
import { cn } from "@/lib/cn";
import { Avatar } from "./Avatar";

interface PlayerBadgeProps {
  name: string;
  avatarId: string;
  isHost?: boolean;
  isBot?: boolean;
  isOnline?: boolean;
  className?: string;
}

export function PlayerBadge({
  name,
  avatarId,
  isHost,
  isBot,
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
              "absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white",
              isOnline ? "bg-emerald-500" : "bg-slate-400",
            )}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-slate-800">
          {name}
        </span>
        <div className="flex items-center gap-1.5">
          {isHost && (
            <span className="text-[10px] font-bold tracking-wide text-teal-700 uppercase">
              Host
            </span>
          )}
          {isBot && (
            <span className="rounded-full border border-violet-200 bg-violet-50 px-1.5 py-px text-[9px] font-bold tracking-wide text-violet-700 uppercase">
              AI
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
