"use client";

import { hotelsForHouseLimit } from "@f4fun/monopoly-engine";
import { CashAmountSlider } from "@/components/ui/CashAmountSlider";

export interface HostGameOptionsValue {
  startingCash: number;
  goSalary: number;
  bankHouseLimit: number;
}

interface HostGameOptionsProps {
  value: HostGameOptionsValue;
  onChange: (next: HostGameOptionsValue) => void;
  disabled?: boolean;
}

/** Host house-rules controls for lobby start. */
export function HostGameOptions({
  value,
  onChange,
  disabled = false,
}: HostGameOptionsProps) {
  const hotels = hotelsForHouseLimit(value.bankHouseLimit);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">
        House rules
      </p>
      <CashAmountSlider
        label="Starting cash"
        value={value.startingCash}
        min={500}
        max={2000}
        step={100}
        disabled={disabled}
        onChange={(startingCash) => onChange({ ...value, startingCash })}
      />
      <CashAmountSlider
        label="GO salary"
        value={value.goSalary}
        min={50}
        max={500}
        step={50}
        disabled={disabled}
        onChange={(goSalary) => onChange({ ...value, goSalary })}
      />
      <div className="w-full space-y-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <label
            htmlFor="host-bank-houses"
            className="font-medium text-slate-500"
          >
            Bank houses
          </label>
          <span className="font-bold text-emerald-700 tabular-nums">
            {value.bankHouseLimit}
          </span>
        </div>
        <input
          id="host-bank-houses"
          type="range"
          min={8}
          max={32}
          step={8}
          value={value.bankHouseLimit}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...value,
              bankHouseLimit: Number(e.target.value),
            })
          }
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-teal-700 disabled:cursor-not-allowed disabled:opacity-40 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-teal-800 [&::-webkit-slider-thumb]:bg-teal-700"
          aria-valuemin={8}
          aria-valuemax={32}
          aria-valuenow={value.bankHouseLimit}
          aria-label="Bank houses"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>8</span>
          <span>Hotels: {hotels}</span>
          <span>32</span>
        </div>
      </div>
    </div>
  );
}

export const DEFAULT_HOST_GAME_OPTIONS: HostGameOptionsValue = {
  startingCash: 1500,
  goSalary: 200,
  bankHouseLimit: 32,
};
