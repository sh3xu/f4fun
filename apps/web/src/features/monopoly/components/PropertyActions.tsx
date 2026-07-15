import { Button } from "@/components/ui/Button";

interface BuyActionsProps {
  mode: "buy";
  label: string;
  canAfford: boolean;
  loading: boolean;
  onBuy: () => void;
  onDecline: () => void;
  onAuction: () => void;
}

interface ManageActionsProps {
  mode: "manage";
  label: string;
  loading: boolean;
  isProperty: boolean;
  isMortgaged: boolean;
  houses: number;
  hotels: number;
  onBuild: () => void;
  onSell: () => void;
  onMortgage: () => void;
  onUnmortgage: () => void;
  onOwnerAuction: () => void;
  onClose: () => void;
}

interface ViewActionsProps {
  mode: "view";
  onClose: () => void;
}

export type PropertyActionsProps =
  | BuyActionsProps
  | ManageActionsProps
  | ViewActionsProps;

const btnClass =
  "h-auto flex-1 py-[clamp(0.25rem,1cqmin,0.45rem)] text-[length:var(--board-text-xs)] font-bold";

/** Buy / manage / view-only action row for the center property card. */
export function PropertyActions(props: PropertyActionsProps) {
  if (props.mode === "view") {
    return (
      <div className="flex gap-[clamp(0.25rem,0.9cqmin,0.4rem)]">
        <Button
          onClick={props.onClose}
          size="sm"
          className={`${btnClass} border-0 bg-slate-600/80 backdrop-blur-sm hover:bg-slate-600`}
          aria-label="Close"
        >
          Close
        </Button>
      </div>
    );
  }

  if (props.mode === "buy") {
    const { label, canAfford, loading, onBuy, onDecline, onAuction } = props;
    return (
      <div className="flex gap-[clamp(0.25rem,0.9cqmin,0.4rem)]">
        <Button
          onClick={onBuy}
          disabled={loading || !canAfford}
          size="sm"
          className={`${btnClass} border-0 bg-[#2196f3]/80 backdrop-blur-sm hover:bg-[#2196f3]`}
          aria-label={`Buy ${label}`}
        >
          {canAfford ? "Buy" : "Can't Afford"}
        </Button>
        <Button
          onClick={onDecline}
          disabled={loading}
          variant="outline"
          size="sm"
          className={`${btnClass} border-white/20 text-white/80 hover:bg-white/10`}
          aria-label={`Skip ${label}`}
        >
          Skip
        </Button>
        <Button
          onClick={onAuction}
          disabled={loading}
          variant="outline"
          size="sm"
          className={`${btnClass} border-amber-400/30 text-amber-200 hover:bg-amber-500/10`}
          aria-label={`Auction ${label}`}
        >
          Auction
        </Button>
      </div>
    );
  }

  const {
    label,
    loading,
    isProperty,
    isMortgaged,
    houses,
    hotels,
    onBuild,
    onSell,
    onMortgage,
    onUnmortgage,
    onOwnerAuction,
    onClose,
  } = props;
  const hasBuildings = houses > 0 || hotels > 0;

  return (
    <div className="flex flex-col gap-[clamp(0.25rem,0.9cqmin,0.4rem)]">
      <div className="grid grid-cols-2 gap-[clamp(0.25rem,0.9cqmin,0.4rem)]">
        {isProperty && (
          <>
            <Button
              size="sm"
              disabled={loading || isMortgaged}
              onClick={onBuild}
              className={`${btnClass} border-0 bg-[#2196f3]/70`}
              aria-label={
                houses >= 4
                  ? `Build hotel on ${label}`
                  : `Build house on ${label}`
              }
            >
              Build
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={loading || !hasBuildings}
              onClick={onSell}
              className={`${btnClass} border-white/20 text-white/80`}
              aria-label={
                hotels > 0 ? `Sell hotel on ${label}` : `Sell house on ${label}`
              }
            >
              Sell
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={loading || (!isMortgaged && hasBuildings)}
          onClick={isMortgaged ? onUnmortgage : onMortgage}
          className={`${btnClass} border-white/20 text-white/80`}
          aria-label={isMortgaged ? `Unmortgage ${label}` : `Mortgage ${label}`}
        >
          {isMortgaged ? "Unmortgage" : "Mortgage"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading || hasBuildings}
          onClick={onOwnerAuction}
          className={`${btnClass} border-amber-400/30 text-amber-200`}
          aria-label={`Auction ${label}`}
        >
          Auction
        </Button>
      </div>
      <Button
        onClick={onClose}
        size="sm"
        variant="outline"
        className={`${btnClass} w-full border-white/15 text-white/70`}
        aria-label="Close"
      >
        Close
      </Button>
    </div>
  );
}
