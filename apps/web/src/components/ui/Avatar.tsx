"use client";

import Image from "next/image";
import { getAvatarUrl } from "@/lib/avatars";
import { cn } from "@/lib/cn";

interface AvatarProps {
  avatarId: string;
  size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl";
  isActive?: boolean;
  backgroundColor?: string;
  className?: string;
}

export function Avatar({
  avatarId,
  size = "md",
  isActive = false,
  backgroundColor,
  className,
}: AvatarProps) {
  const url = getAvatarUrl(avatarId);

  const sizeConfig = {
    xxs: {
      size: 12,
      classes: "h-3 w-3 border border-white",
      activeClass: "ring-1 ring-teal-400 ring-offset-[0.5px] scale-105",
    },
    xs: {
      size: 20,
      classes: "h-5 w-5 border border-white",
      activeClass: "ring-[1.5px] ring-teal-400 ring-offset-[1px] scale-105",
    },
    sm: {
      size: 32,
      classes: "h-8 w-8",
      activeClass: "ring-2 ring-teal-400 ring-offset-1 scale-105",
    },
    md: {
      size: 40,
      classes: "h-10 w-10",
      activeClass: "ring-[3px] ring-teal-400 ring-offset-2 scale-110",
    },
    lg: {
      size: 56,
      classes: "h-14 w-14",
      activeClass: "ring-4 ring-teal-400 ring-offset-2 scale-110",
    },
    xl: {
      size: 80,
      classes: "h-20 w-20",
      activeClass: "ring-4 ring-teal-400 ring-offset-2 scale-110",
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      key={avatarId}
      className={cn(
        config.classes,
        "material-piece relative flex-shrink-0 overflow-hidden rounded-full transition-transform duration-200",
        isActive && config.activeClass,
        className,
      )}
      style={{
        backgroundColor,
        backgroundImage:
          "linear-gradient(145deg, rgba(255,255,255,0.4) 0%, transparent 45%, rgba(0,0,0,0.15) 100%)",
      }}
    >
      <Image
        key={avatarId}
        src={url}
        alt="Player avatar"
        width={config.size}
        height={config.size}
        className="h-full w-full object-cover"
        priority={false}
      />
    </div>
  );
}
