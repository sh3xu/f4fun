"use client";

import Image from "next/image";
import { getAvatarUrl } from "@/lib/avatars";
import { cn } from "@/lib/cn";

interface AvatarProps {
  avatarId: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isActive?: boolean;
  backgroundColor?: string;
}

export function Avatar({
  avatarId,
  size = "md",
  isActive = false,
  backgroundColor,
}: AvatarProps) {
  const url = getAvatarUrl(avatarId);

  const sizeConfig = {
    xs: { size: 20, classes: "w-5 h-5 border border-white" },
    sm: { size: 32, classes: "w-8 h-8" },
    md: { size: 40, classes: "w-10 h-10" },
    lg: { size: 56, classes: "w-14 h-14" },
    xl: { size: 80, classes: "w-20 h-20" },
  };

  const config = sizeConfig[size];

  return (
    <div
      key={avatarId}
      className={cn(
        config.classes,
        "rounded-full overflow-hidden flex-shrink-0 shadow-lg",
        isActive && "ring-4 ring-blue-300 ring-offset-2 scale-110",
      )}
      style={{ backgroundColor }}
    >
      <Image
        key={avatarId}
        src={url}
        alt="Player avatar"
        width={config.size}
        height={config.size}
        className="w-full h-full object-cover"
        priority={false}
      />
    </div>
  );
}
