import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--material-focus-glow)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "material-token text-white font-bold",
        token: "material-token text-white font-bold",
        tokenGhost: "material-token-ghost font-semibold",
        secondary:
          "material-token-ghost bg-white/[0.06] text-gray-100 font-semibold",
        outline:
          "material-token-ghost border-white/25 bg-transparent text-white/85",
        ghost:
          "rounded-md bg-transparent text-white/70 hover:bg-white/10 hover:text-white",
        danger:
          "material-token bg-red-600 text-white font-bold [--material-token-face:#dc2626]",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-6 text-lg",
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

/** Pressable game control — token (primary) or ghost (secondary) materials. */
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
