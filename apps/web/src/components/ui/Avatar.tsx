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
    xs: {
      size: 20,
      classes: "w-5 h-5 border border-white",
      activeClass: "ring-[1.5px] ring-blue-300 ring-offset-[1px] scale-105",
    },
    sm: {
      size: 32,
      classes: "w-8 h-8",
      activeClass: "ring-2 ring-blue-300 ring-offset-1 scale-105",
    },
    md: {
      size: 40,
      classes: "w-10 h-10",
      activeClass: "ring-[3px] ring-blue-300 ring-offset-2 scale-110",
    },
    lg: {
      size: 56,
      classes: "w-14 h-14",
      activeClass: "ring-4 ring-blue-300 ring-offset-2 scale-110",
    },
    xl: {
      size: 80,
      classes: "w-20 h-20",
      activeClass: "ring-4 ring-blue-300 ring-offset-2 scale-110",
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      key={avatarId}
      className={cn(
        config.classes,
        "material-piece relative rounded-full overflow-hidden flex-shrink-0 transition-transform duration-200",
        isActive && config.activeClass,
      )}
      style={{
        backgroundColor,
        backgroundImage:
          "linear-gradient(145deg, rgba(255,255,255,0.35) 0%, transparent 45%, rgba(0,0,0,0.25) 100%)",
      }}
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
