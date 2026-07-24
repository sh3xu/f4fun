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

/** Soft table wash + brand header for landing and lobby. */
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
        "material-felt relative flex min-h-dvh flex-col items-center justify-center overflow-hidden p-4 font-sans text-slate-800 select-none",
        className,
      )}
    >
      <div className="relative z-[2] flex w-full max-w-lg flex-col items-center">
        {(title || subtitle) && (
          <RailFrame
            as="header"
            className="mb-6 w-full px-5 py-5 text-center animate-fade-in"
          >
            {title && (
              <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                <span className="text-teal-700">{title}</span>
              </h1>
            )}
            {subtitle && (
              <p className="mt-1.5 text-sm font-medium text-slate-500">
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
