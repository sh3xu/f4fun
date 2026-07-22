import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--material-focus-glow)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "material-token text-white font-bold",
        token: "material-token text-white font-bold",
        tokenGhost: "material-token-ghost font-semibold",
        secondary:
          "material-token-ghost bg-slate-50 text-slate-700 font-semibold",
        outline:
          "material-token-ghost border-slate-300 bg-transparent text-slate-700",
        ghost:
          "rounded-lg bg-transparent text-slate-600 hover:bg-teal-50 hover:text-teal-800",
        danger:
          "material-token text-white font-bold [--material-token-face:#e11d48]",
      },
      size: {
        sm: "h-9 min-h-9 px-3 text-sm",
        md: "h-11 min-h-11 px-4 text-base",
        lg: "h-12 min-h-12 px-6 text-lg",
      },
    },
    defaultVariants: {
      variant: "token",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

/** Pressable game control — token (primary) or ghost (secondary). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
