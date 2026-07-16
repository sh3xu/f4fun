import type { ReactNode } from "react";
import { RailFrame } from "@/components/ui/RailFrame";
import { cn } from "@/lib/cn";

interface TableShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  contentClassName?: string;
}

/** Shared felt table + rail header shell for landing and lobby. */
export function TableShell({
  children,
  title,
  subtitle,
  className,
  contentClassName,
}: TableShellProps) {
  return (
    <div
      className={cn(
        "material-felt relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 font-sans text-slate-100 select-none",
        className,
      )}
    >
      <div className="relative z-[2] flex w-full max-w-lg flex-col items-center">
        {(title || subtitle) && (
          <RailFrame
            as="header"
            className="mb-6 w-full px-5 py-4 text-center animate-fade-in"
          >
            {title && (
              <h1 className="bg-gradient-to-r from-[#4fc3f7] via-[#29b6f6] to-[#26c6da] bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1.5 text-sm font-medium text-slate-400">
                {subtitle}
              </p>
            )}
          </RailFrame>
        )}
        <div className={cn("w-full", contentClassName)}>{children}</div>
      </div>
    </div>
  );
}
