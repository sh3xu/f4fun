import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/** Form field for bright table / card surfaces. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className="mb-1.5 block text-sm font-semibold text-slate-600"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={props.id}
          className={cn(
            "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900",
            "placeholder:text-slate-400",
            "focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-[var(--material-focus-glow)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-rose-400 focus:ring-rose-400",
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
