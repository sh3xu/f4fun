import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CardStock =
  | "property"
  | "chance"
  | "community"
  | "buyPrompt"
  | "auction";

const CARD_STOCK: Record<
  CardStock,
  { headerClass: string; edgeClass: string; bodyClass?: string }
> = {
  property: {
    headerClass: "",
    edgeClass: "border-slate-200",
  },
  chance: {
    headerClass: "bg-gradient-to-b from-[#ffb347] to-[#f7941d]",
    edgeClass: "border-amber-300",
    bodyClass: "bg-gradient-to-b from-amber-50 to-white",
  },
  community: {
    headerClass: "bg-gradient-to-b from-teal-400 to-teal-600",
    edgeClass: "border-teal-200",
    bodyClass: "bg-gradient-to-b from-teal-50 to-white",
  },
  buyPrompt: {
    headerClass: "bg-gradient-to-b from-teal-400 to-teal-700",
    edgeClass: "border-teal-300 shadow-[0_10px_28px_rgba(13,148,136,0.18)]",
    bodyClass: "bg-gradient-to-b from-teal-50/80 to-white",
  },
  auction: {
    headerClass: "bg-gradient-to-b from-amber-300 to-amber-500",
    edgeClass: "border-amber-300",
    bodyClass: "bg-gradient-to-b from-amber-50 to-white",
  },
};

interface GameCardProps extends HTMLAttributes<HTMLDivElement> {
  stock?: CardStock;
  /** Colored title strip — like a printed Monopoly deed header. */
  header?: ReactNode;
  headerClassName?: string;
  dealIn?: boolean;
  /** Optional full-bleed layer behind header/body (e.g. blurred property art). */
  backdrop?: ReactNode;
}

/** Elevated white card with optional color header band and stock variant. */
export function GameCard({
  stock = "property",
  header,
  headerClassName,
  dealIn = false,
  backdrop,
  className,
  children,
  ...props
}: GameCardProps) {
  const stockStyle = CARD_STOCK[stock];

  return (
    <div
      className={cn(
        "material-cardstock relative isolate overflow-hidden",
        stockStyle.edgeClass,
        !backdrop && stockStyle.bodyClass,
        backdrop && "bg-transparent",
        dealIn && "animate-card-deal",
        className,
      )}
      {...props}
    >
      {backdrop != null && (
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          {backdrop}
        </div>
      )}
      {header != null && (
        <div
          className={cn(
            "material-cardstock-header font-card-label relative z-10 px-3 py-2 text-center text-sm font-bold tracking-wide text-white uppercase",
            stockStyle.headerClass,
            headerClassName,
          )}
        >
          {header}
        </div>
      )}
      <div className="relative z-10 contents [&>*]:relative [&>*]:z-10">
        {children}
      </div>
    </div>
  );
}
