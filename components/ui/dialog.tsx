"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { LogOut, X } from "lucide-react";
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
  /** Icône optionnelle au-dessus du titre (ex. déconnexion). */
  icon?: ReactNode;
  tone?: "default" | "destructive";
  /**
   * Couleur du pastille d’icône. Par défaut = `tone`.
   * Permet un header « danger » tout en gardant Confirmer en bleu (actions côte à côte).
   */
  iconTone?: "default" | "destructive";
  /**
   * Disposition des actions. `auto` : empilé si >2 actions ou tone destructive ;
   * `row` : toujours 2 colonnes ; `stack` : toujours empilé.
   */
  actionsLayout?: "auto" | "row" | "stack";
  /** Largeur max : sm 300 (défaut), md 420, lg 520. */
  size?: "sm" | "md" | "lg";
  /** Accessible name override; defaults to title. */
  "aria-label"?: string;
};

const SIZE_CLASS: Record<NonNullable<DialogProps["size"]>, string> = {
  sm: "max-w-[300px]",
  md: "max-w-[420px]",
  lg: "max-w-[min(520px,100%)]",
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
  icon,
  tone = "default",
  iconTone,
  actionsLayout = "auto",
  size = "sm",
  "aria-label": ariaLabel,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  // Focus initial une seule fois à l’ouverture — pas à chaque rendu (sinon perte du curseur).
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChangeRef.current(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open || !mounted) return null;

  const stacked =
    actionsLayout === "stack" ||
    (actionsLayout === "auto" && (actions.length > 2 || tone === "destructive"));
  const resolvedIconTone = iconTone ?? tone;
  const headerIcon =
    icon ??
    (tone === "destructive" ? (
      <LogOut className="size-6 stroke-[1.75]" aria-hidden />
    ) : null);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 cursor-pointer bg-black/40 backdrop-blur-[6px] fade-in"
        onClick={() => onOpenChange(false)}
      />

      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-label={ariaLabel}
        className={cn(
          "relative z-10 my-auto flex w-full max-h-[min(92dvh,880px)] flex-col overflow-hidden rounded-[var(--radius-xl)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-lg)] ring-1 ring-[var(--ios-separator)] slide-up",
          SIZE_CLASS[size],
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-5 pb-4 pt-5 text-center sm:px-6 sm:pt-6">
          {headerIcon ? (
            <div
              className={cn(
                "mx-auto mb-3 flex size-12 items-center justify-center rounded-full sm:mb-4 sm:size-14",
                resolvedIconTone === "destructive"
                  ? "bg-[var(--ios-danger-soft)] text-[var(--ios-danger)]"
                  : "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]",
              )}
              aria-hidden
            >
              {headerIcon}
            </div>
          ) : null}

          <h2
            id={titleId}
            className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]"
          >
            {title}
          </h2>
          {description ? (
            <p
              id={descriptionId}
              className="mx-auto mt-1.5 max-w-[36ch] text-[12px] leading-relaxed text-[var(--ios-secondary-label)] sm:max-w-none"
            >
              {description}
            </p>
          ) : null}
          {children ? (
            <div className="mt-4 w-full text-left sm:mt-5">{children}</div>
          ) : null}
        </div>

        <div
          className={cn(
            "shrink-0 border-t border-[var(--ios-separator)] bg-[var(--ios-card)]",
            stacked ? "flex flex-col-reverse" : "grid grid-cols-2",
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
                "pressable min-h-11 cursor-pointer px-3 py-3 text-[13px] transition-colors hover:bg-[var(--ios-fill)]/70 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
                !stacked &&
                  index > 0 &&
                  "border-l border-[var(--ios-separator)]",
                stacked &&
                  index < actions.length - 1 &&
                  "border-t border-[var(--ios-separator)]",
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

type DialogCloseButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** Bouton X rouge partagé par les panneaux / modales. */
export function DialogCloseButton({
  className,
  type = "button",
  ...props
}: DialogCloseButtonProps) {
  return (
    <button
      type={type}
      {...props}
      className={cn(
        "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--ios-danger-soft)] text-[var(--ios-danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--ios-danger)_22%,transparent)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <X className="size-4 stroke-[2]" aria-hidden />
    </button>
  );
}
