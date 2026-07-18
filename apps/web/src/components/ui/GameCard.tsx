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
    edgeClass: "border-white/[0.22]",
  },
  chance: {
    headerClass: "bg-gradient-to-b from-[#ffb347] to-[#f7941d]",
    edgeClass: "border-amber-400/70",
    bodyClass:
      "bg-gradient-to-b from-amber-600/35 via-amber-950/50 to-[rgba(18,26,40,0.94)]",
  },
  community: {
    headerClass: "bg-gradient-to-b from-[#4fc3f7] to-[#00aeef]",
    edgeClass: "border-sky-400/70",
    bodyClass:
      "bg-gradient-to-b from-sky-500/35 via-sky-950/50 to-[rgba(18,26,40,0.94)]",
  },
  buyPrompt: {
    headerClass: "bg-gradient-to-b from-[#81d4fa] to-[#2196f3]",
    edgeClass: "border-[#4fc3f7]/70 shadow-[4px_10px_22px_rgba(0,0,0,0.5)]",
    bodyClass:
      "bg-gradient-to-b from-sky-400/30 via-sky-950/40 to-[rgba(18,26,40,0.94)]",
  },
  auction: {
    headerClass: "bg-gradient-to-b from-amber-300 to-amber-600",
    edgeClass: "border-amber-400/70",
    bodyClass:
      "bg-gradient-to-b from-amber-400/30 via-amber-950/45 to-[rgba(18,26,40,0.94)]",
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
        stockStyle.bodyClass,
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
