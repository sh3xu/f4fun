import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/** Form field styled for the dark table / cardstock surfaces. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className="mb-1 block text-sm font-medium text-white/70"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={props.id}
          className={cn(
            "h-10 w-full rounded-md border border-white/15 bg-black/30 px-3 text-base text-white",
            "placeholder:text-white/35",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--material-focus-glow)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-rose-500 focus:ring-rose-500",
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-rose-400">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
