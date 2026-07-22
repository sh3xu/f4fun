"use client";

import { useId } from "react";
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
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const safeMax = Math.max(min, max);
  const clamped = Math.min(safeMax, Math.max(min, value));

  return (
    <div className={cn("w-full space-y-1", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        {label ? (
          <label htmlFor={inputId} className="font-medium text-slate-500">
            {label}
          </label>
        ) : (
          <span className="text-slate-500">Amount</span>
        )}
        <span className="font-bold text-emerald-700 tabular-nums">
          ${clamped}
        </span>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={safeMax}
        step={step}
        value={clamped}
        disabled={disabled || safeMax <= min}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-teal-700",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5",
          "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-teal-800",
          "[&::-webkit-slider-thumb]:bg-teal-700",
        )}
        aria-valuemin={min}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        aria-label={label ?? "Cash amount"}
      />
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>${min}</span>
        <span>${safeMax}</span>
      </div>
    </div>
  );
}
