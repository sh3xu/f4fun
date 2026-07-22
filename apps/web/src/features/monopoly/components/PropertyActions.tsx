import {
  buildingSellPayout,
  COLOR_GROUP_BUILDINGS_CLEAR_ERROR,
  hotelDevelopmentCost,
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
    deedTransferBlocked,
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

  const buildHotel = houses >= 4;
  const buildPrice = buildHotel ? hotelUpgradeCost(houseCost) : houseCost;
  const sellHotel = hotels > 0;
  const sellPayout = sellHotel
    ? buildingSellPayout(hotelDevelopmentCost(houseCost))
    : buildingSellPayout(houseCost);

  return (
    <div className="flex flex-col gap-[clamp(0.25rem,0.9cqmin,0.4rem)]">
      {deedTransferBlocked && (
        <p className="text-[length:var(--board-text-xs)] leading-snug text-amber-200/90">
          {COLOR_GROUP_BUILDINGS_CLEAR_ERROR}
        </p>
      )}
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
                buildHotel
                  ? `Build hotel on ${label} for $${buildPrice}`
                  : `Build house on ${label} for $${buildPrice}`
              }
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
            <Button
              variant="tokenGhost"
              size="sm"
              disabled={loading || !canSellBuilding}
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
          </>
        )}
        <Button
          variant="tokenGhost"
          size="sm"
          disabled={loading || (!isMortgaged && deedTransferBlocked)}
          onClick={isMortgaged ? onUnmortgage : onMortgage}
          className={btnClass}
          title={
            !isMortgaged && deedTransferBlocked
              ? COLOR_GROUP_BUILDINGS_CLEAR_ERROR
              : undefined
          }
          aria-label={isMortgaged ? `Unmortgage ${label}` : `Mortgage ${label}`}
        >
          {isMortgaged ? "Unmortgage" : "Mortgage"}
        </Button>
        <Button
          variant="tokenGhost"
          size="sm"
          disabled={loading || deedTransferBlocked}
          onClick={onOwnerAuction}
          className={`${btnClass} border-amber-400/30 text-amber-200`}
          title={
            deedTransferBlocked ? COLOR_GROUP_BUILDINGS_CLEAR_ERROR : undefined
          }
          aria-label={`Auction ${label}`}
        >
          Auction
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading || deedTransferBlocked}
          onClick={onSellToBank}
          className={`${btnClass} border-rose-400/30 text-rose-200`}
          title={
            deedTransferBlocked ? COLOR_GROUP_BUILDINGS_CLEAR_ERROR : undefined
          }
          aria-label={`Sell ${label} to bank`}
        >
          Sell to Bank
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
