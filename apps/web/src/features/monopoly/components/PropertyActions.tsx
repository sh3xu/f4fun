import {
  buildingSellPayout,
  COLOR_GROUP_BUILDINGS_CLEAR_ERROR,
  hotelUpgradeCost,
} from "@f4fun/monopoly-engine";
import { Home, Hotel, Minus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BOARD_MONEY_CLASS } from "../theme/board-theme";

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
  /** Issue #52 — true when monopoly color-group still has buildings. */
  deedTransferBlocked: boolean;
  canBuild: boolean;
  canSellBuilding: boolean;
  houseCost: number;
  onBuild: () => void;
  onSell: () => void;
  onMortgage: () => void;
  onUnmortgage: () => void;
  onOwnerAuction: () => void;
  onSellToBank: () => void;
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

const iconClass = "h-[1.1em] w-[1.1em] shrink-0";

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
        {canAfford && (
          <Button
            variant="token"
            onClick={onBuy}
            disabled={loading}
            size="sm"
            className={btnClass}
            aria-label={`Buy ${label}`}
          >
            Buy
          </Button>
        )}
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
          className={`${btnClass} border-amber-300 text-amber-800`}
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
    deedTransferBlocked,
    canBuild,
    canSellBuilding,
    houseCost,
    onBuild,
    onSell,
    onMortgage,
    onUnmortgage,
    onOwnerAuction,
    onSellToBank,
    onClose,
  } = props;

  // NOTE: Engine clears houses when a hotel is placed — derive UI from hotels first.
  const hotelBuilt = hotels > 0;
  const buildHotel = !hotelBuilt && houses >= 4;
  const buildPrice = buildHotel ? hotelUpgradeCost(houseCost) : houseCost;
  const sellHotel = hotelBuilt;
  const sellPayout = sellHotel
    ? buildingSellPayout(hotelUpgradeCost(houseCost))
    : buildingSellPayout(houseCost);

  const buildAriaLabel = buildHotel
    ? `Build hotel on ${label} for $${buildPrice}`
    : `Build house on ${label} for $${buildPrice}`;

  const showDeedTransfer = !deedTransferBlocked;

  return (
    <div className="flex flex-col gap-[clamp(0.25rem,0.9cqmin,0.4rem)]">
      {deedTransferBlocked && (
        <p className="text-[length:var(--board-text-xs)] leading-snug text-amber-800">
          {COLOR_GROUP_BUILDINGS_CLEAR_ERROR}
        </p>
      )}
      <div className="grid grid-cols-2 gap-[clamp(0.25rem,0.9cqmin,0.4rem)]">
        {isProperty && canBuild && (
          <Button
            variant="token"
            size="sm"
            disabled={loading}
            onClick={onBuild}
            className={btnClass}
            aria-label={buildAriaLabel}
          >
            <span className="inline-flex items-center justify-center gap-1">
              {buildHotel ? (
                <Hotel className={iconClass} aria-hidden />
              ) : (
                <Home className={iconClass} aria-hidden />
              )}
              <span className={BOARD_MONEY_CLASS}>${buildPrice}</span>
            </span>
          </Button>
        )}
        {isProperty && canSellBuilding && (
          <Button
            variant="tokenGhost"
            size="sm"
            disabled={loading}
            onClick={onSell}
            className={btnClass}
            aria-label={
              sellHotel
                ? `Sell hotel on ${label} for $${sellPayout}`
                : `Sell house on ${label} for $${sellPayout}`
            }
          >
            <span className="inline-flex items-center justify-center gap-1">
              <Minus className={iconClass} aria-hidden />
              {sellHotel ? (
                <Hotel className={iconClass} aria-hidden />
              ) : (
                <Home className={iconClass} aria-hidden />
              )}
              <span className={BOARD_MONEY_CLASS}>${sellPayout}</span>
            </span>
          </Button>
        )}
        {isMortgaged ? (
          <Button
            variant="tokenGhost"
            size="sm"
            disabled={loading}
            onClick={onUnmortgage}
            className={btnClass}
            aria-label={`Unmortgage ${label}`}
          >
            Unmortgage
          </Button>
        ) : (
          showDeedTransfer && (
            <Button
              variant="tokenGhost"
              size="sm"
              disabled={loading}
              onClick={onMortgage}
              className={btnClass}
              aria-label={`Mortgage ${label}`}
            >
              Mortgage
            </Button>
          )
        )}
        {showDeedTransfer && (
          <Button
            variant="tokenGhost"
            size="sm"
            disabled={loading}
            onClick={onOwnerAuction}
            className={`${btnClass} border-amber-300 text-amber-800`}
            aria-label={`Auction ${label}`}
          >
            Auction
          </Button>
        )}
        {showDeedTransfer && (
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={onSellToBank}
            className={`${btnClass} border-rose-300 text-rose-700`}
            aria-label={`Sell ${label} to bank`}
          >
            Sell to Bank
          </Button>
        )}
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
