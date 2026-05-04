"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            className={cn(
              "relative w-full glass-strong rounded-3xl ring-gradient",
              "shadow-[0_40px_120px_-10px_rgba(168,85,247,0.35)]",
              sizes[size],
              className,
            )}
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:border-white/30 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            {(title || subtitle) && (
              <div className="px-6 pt-6 pb-4 border-b border-white/5">
                {title && (
                  <h2 className="font-display text-xl tracking-wide text-white pr-8">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-white/60">{subtitle}</p>
                )}
              </div>
            )}
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
              {children}
            </div>
            {footer && (
              <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
