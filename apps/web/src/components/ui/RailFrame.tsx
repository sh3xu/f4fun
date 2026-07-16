import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface RailFrameProps extends HTMLAttributes<HTMLElement> {
  as?: "aside" | "div" | "header" | "section";
  children: ReactNode;
}

/** Scoreboard / table-rail shell for sidebars and page headers. */
export function RailFrame({
  as: Tag = "div",
  className,
  children,
  ...props
}: RailFrameProps) {
  return (
    <Tag className={cn("material-rail rounded-xl", className)} {...props}>
      {children}
    </Tag>
  );
}
