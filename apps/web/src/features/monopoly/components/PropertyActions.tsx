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
  onClose?: () => void;
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
          variant="tokenGhost"
          onClick={props.onClose}
          size="sm"
          className={btnClass}
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
          variant="token"
          onClick={onBuy}
          disabled={loading || !canAfford}
          size="sm"
          className={btnClass}
          aria-label={`Buy ${label}`}
        >
          {canAfford ? "Buy" : "Can't Afford"}
        </Button>
        <Button
          variant="tokenGhost"
          onClick={onDecline}
          disabled={loading}
          size="sm"
          className={btnClass}
          aria-label={`Skip ${label}`}
        >
          Skip
        </Button>
        <Button
          variant="tokenGhost"
          onClick={onAuction}
          disabled={loading}
          size="sm"
          className={`${btnClass} border-amber-400/30 text-amber-200`}
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
              variant="token"
              size="sm"
              disabled={loading || isMortgaged || hotels > 0}
              onClick={onBuild}
              className={btnClass}
              aria-label={
                houses >= 4
                  ? `Build hotel on ${label}`
                  : `Build house on ${label}`
              }
            >
              Build
            </Button>
            <Button
              variant="tokenGhost"
              size="sm"
              disabled={loading || !hasBuildings}
              onClick={onSell}
              className={btnClass}
              aria-label={
                hotels > 0 ? `Sell hotel on ${label}` : `Sell house on ${label}`
              }
            >
              Sell
            </Button>
          </>
        )}
        <Button
          variant="tokenGhost"
          size="sm"
          disabled={loading || (!isMortgaged && hasBuildings)}
          onClick={isMortgaged ? onUnmortgage : onMortgage}
          className={btnClass}
          aria-label={isMortgaged ? `Unmortgage ${label}` : `Mortgage ${label}`}
        >
          {isMortgaged ? "Unmortgage" : "Mortgage"}
        </Button>
        <Button
          variant="tokenGhost"
          size="sm"
          disabled={loading || hasBuildings}
          onClick={onOwnerAuction}
          className={`${btnClass} border-amber-400/30 text-amber-200`}
          aria-label={`Auction ${label}`}
        >
          Auction
        </Button>
      </div>
      {onClose && (
        <Button
          variant="tokenGhost"
          onClick={onClose}
          size="sm"
          className={`${btnClass} w-full`}
          aria-label="Close"
        >
          Close
        </Button>
      )}
    </div>
  );
}
