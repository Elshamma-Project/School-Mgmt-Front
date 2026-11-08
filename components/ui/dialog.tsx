"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

export type DialogAction = {
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "cancel";
  autoFocus?: boolean;
};

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  actions: DialogAction[];
  /** Accessible name override; defaults to title. */
  "aria-label"?: string;
};

/**
 * Dialogue style iOS (alert) — rendu en portal sur `document.body`
 * pour rester centré sur tout l’écran (hors sidebar / blur parents).
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  "aria-label": ariaLabel,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-pointer bg-black/35 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />

      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-label={ariaLabel}
        className="relative z-10 w-full max-w-[270px] overflow-hidden rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--ios-card)_94%,transparent)] shadow-[var(--ios-shadow-lg)] backdrop-blur-xl slide-up"
      >
        <div className="px-4 pb-3.5 pt-5 text-center">
          <h2
            id={titleId}
            className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]"
          >
            {title}
          </h2>
          {description ? (
            <p
              id={descriptionId}
              className="mt-1 text-[13px] leading-snug text-[var(--ios-secondary-label)]"
            >
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-3 text-left">{children}</div> : null}
        </div>

        <div
          className={cn(
            "grid border-t border-[var(--ios-separator)]",
            actions.length > 1 ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {actions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              type="button"
              data-autofocus={action.autoFocus ? "" : undefined}
              onClick={() => {
                action.onClick();
                onOpenChange(false);
              }}
              className={cn(
                "min-h-11 cursor-pointer px-2 py-2.5 text-[17px] transition-colors hover:bg-[var(--ios-fill)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ios-blue)]/35",
                index > 0 && actions.length > 1
                  ? "border-l border-[var(--ios-separator)]"
                  : null,
                action.variant === "destructive" &&
                  "font-semibold text-[var(--ios-danger)]",
                action.variant === "cancel" &&
                  "font-normal text-[var(--ios-blue)]",
                (!action.variant || action.variant === "default") &&
                  "font-semibold text-[var(--ios-blue)]",
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
