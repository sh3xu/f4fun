"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface OverlayPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  /** Wider panel for denser content (help / city inspect). */
  size?: "md" | "lg";
}

/** Dimmed fullscreen shell shared by help, chronicle, and inspect panels. */
export function OverlayPanel({
  open,
  onClose,
  title,
  children,
  className,
  size = "md",
}: OverlayPanelProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/65 p-3 sm:items-center sm:p-6"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="overlay-panel-title"
            className={cn(
              "relative flex max-h-[min(88vh,720px)] w-full flex-col overflow-hidden rounded-2xl border border-amber-400/20 bg-[#1a140c] text-amber-50 shadow-[0_20px_60px_rgba(0,0,0,0.55)]",
              size === "lg" ? "max-w-2xl" : "max-w-lg",
              className,
            )}
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }
            }
            transition={{ duration: reduceMotion ? 0.12 : 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <h2
                id="overlay-panel-title"
                className="text-sm font-black uppercase tracking-[0.2em] text-amber-200"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-amber-100/60 transition hover:bg-white/10 hover:text-amber-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {children}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
