"use client";

import { cn } from "@/lib/cn";

interface CashAmountSliderProps {
  value: number;
  min?: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** Cash amount control — slider with a live dollar readout. */
export function CashAmountSlider({
  value,
  min = 0,
  max,
  step = 1,
  onChange,
  label,
  disabled = false,
  className,
  id,
}: CashAmountSliderProps) {
  const safeMax = Math.max(min, max);
  const clamped = Math.min(safeMax, Math.max(min, value));

  return (
    <div className={cn("w-full space-y-1", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        {label ? (
          <label htmlFor={id} className="font-medium text-white/55">
            {label}
          </label>
        ) : (
          <span className="text-white/45">Amount</span>
        )}
        <span className="font-bold tabular-nums text-emerald-400">
          ${clamped}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={safeMax}
        step={step}
        value={clamped}
        disabled={disabled || safeMax <= min}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#4fc3f7]",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/30",
          "[&::-webkit-slider-thumb]:bg-[#4fc3f7]",
        )}
        aria-valuemin={min}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        aria-label={label ?? "Cash amount"}
      />
      <div className="flex justify-between text-[10px] text-white/35">
        <span>${min}</span>
        <span>${safeMax}</span>
      </div>
    </div>
  );
}
