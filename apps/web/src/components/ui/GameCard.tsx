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
  { headerClass: string; edgeClass: string }
> = {
  property: {
    headerClass: "",
    edgeClass: "border-white/[0.18]",
  },
  chance: {
    headerClass: "bg-gradient-to-b from-[#f7941d] to-[#d97d0f]",
    edgeClass: "border-amber-400/35",
  },
  community: {
    headerClass: "bg-gradient-to-b from-[#00aeef] to-[#0090c8]",
    edgeClass: "border-sky-400/35",
  },
  buyPrompt: {
    headerClass: "bg-gradient-to-b from-[#4fc3f7] to-[#2196f3]",
    edgeClass: "border-[#4fc3f7]/40 shadow-[4px_10px_22px_rgba(0,0,0,0.5)]",
  },
  auction: {
    headerClass: "bg-gradient-to-b from-amber-400 to-amber-600",
    edgeClass: "border-amber-400/40",
  },
};

interface GameCardProps extends HTMLAttributes<HTMLDivElement> {
  stock?: CardStock;
  /** Colored title strip — like a printed Monopoly deed header. */
  header?: ReactNode;
  headerClassName?: string;
  dealIn?: boolean;
}

/** Printed cardstock surface with optional embossed header band and stock variant. */
export function GameCard({
  stock = "property",
  header,
  headerClassName,
  dealIn = false,
  className,
  children,
  ...props
}: GameCardProps) {
  const stockStyle = CARD_STOCK[stock];

  return (
    <div
      className={cn(
        "material-cardstock overflow-hidden",
        stockStyle.edgeClass,
        dealIn && "animate-card-deal",
        className,
      )}
      {...props}
    >
      {header != null && (
        <div
          className={cn(
            "material-cardstock-header px-3 py-2 text-center text-sm font-bold uppercase tracking-wide text-white",
            stockStyle.headerClass,
            headerClassName,
          )}
        >
          {header}
        </div>
      )}
      {children}
    </div>
  );
}
