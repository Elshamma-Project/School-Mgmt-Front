"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { NotificationCountBadge } from "@/components/notifications/notification-count-badge";
import { NotificationPreviewList } from "@/components/notifications/notification-preview-list";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  listNotifications,
  type InAppNotificationResponse,
} from "@/lib/api/notifications";
import { useUnreadNotificationCount } from "@/lib/notifications/use-unread-count";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { isAuthFailure } from "@/types/api";

type PanelPos = { top: number; right: number };

/** Cloche header : menu d’aperçu (comme l’aide), puis page complète au clic. */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const count = useUnreadNotificationCount();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos>({ top: 0, right: 16 });
  const [rows, setRows] = useState<InAppNotificationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const all = await listNotifications({ schoolId });
      setRows(all.slice(0, 8));
    } catch (error) {
      if (isAuthFailure(error)) return;
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (!open) return;
    void loadPreview();

    function updatePos() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPanelPos({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    updatePos();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [loadPreview, open]);

  const onSelect = (row: InAppNotificationResponse) => {
    setOpen(false);
    router.push(`/notifications?open=${encodeURIComponent(row.id)}`);
  };

  const layer =
    mounted &&
    createPortal(
      <AnimatePresence>
        {open ? (
          <div key="notif-layer" className="fixed inset-0 z-[200]">
            <motion.button
              type="button"
              aria-label={t("menu.closeOverlay")}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 cursor-default border-0 bg-[color-mix(in_srgb,var(--ios-label)_22%,transparent)] backdrop-blur-[6px]"
              onClick={() => setOpen(false)}
            />

            <motion.div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label={t("menu.title")}
              initial={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 0, y: -8, scale: 0.97 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -6, scale: 0.98 }
              }
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ top: panelPos.top, right: panelPos.right }}
              className="absolute z-10 flex max-h-[min(72dvh,460px)] w-[min(92vw,380px)] origin-top-right flex-col overflow-hidden rounded-[var(--radius-lg)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-md)] ring-1 ring-[color-mix(in_srgb,var(--ios-separator)_70%,transparent)]"
            >
              <div className="relative overflow-hidden border-b border-[var(--ios-separator)]/45 px-3.5 py-3">
                <div
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--ios-blue)_10%,transparent),transparent_55%)]"
                  aria-hidden
                />
                <div className="relative flex min-w-0 items-center gap-2.5">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--ios-info-soft)] text-[var(--ios-blue)] ring-1 ring-[color-mix(in_srgb,var(--ios-blue)_18%,transparent)]">
                    <Bell className="size-3.5 stroke-[1.75]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[14px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
                      {t("menu.title")}
                    </h2>
                    {count > 0 ? (
                      <p className="text-[11px] text-[var(--ios-secondary-label)]">
                        {t("bellUnread", { count })}
                      </p>
                    ) : null}
                  </div>
                  {count > 0 ? <NotificationCountBadge count={count} /> : null}
                  <button
                    type="button"
                    aria-label={t("menu.close")}
                    title={t("menu.close")}
                    onClick={() => setOpen(false)}
                    className="pressable inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-danger)] transition-colors hover:bg-[var(--ios-danger-soft)] focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <X className="size-4 stroke-[1.75]" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-[color-mix(in_srgb,var(--ios-bg)_55%,var(--ios-card))]">
                <NotificationPreviewList
                  rows={rows}
                  loading={loading}
                  emptyLabel={t("empty")}
                  onSelect={onSelect}
                />
              </div>

              <div className="shrink-0 border-t border-[var(--ios-separator)]/45 bg-[var(--ios-card)] px-3 py-2.5">
                <Link
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className="pressable flex h-9 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--ios-blue)] text-[12px] font-semibold text-white hover:brightness-[1.04] focus-visible:shadow-[var(--focus-ring)]"
                >
                  {t("menu.viewAll")}
                </Link>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>,
      document.body,
    );

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={count > 0 ? t("bellUnread", { count }) : t("bell")}
        title={count > 0 ? t("bellUnread", { count }) : t("bell")}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "pressable relative z-[210] inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)]",
          "bg-[var(--ios-fill)] text-[var(--ios-label)] hover:bg-[var(--ios-fill-secondary)]",
          "transition-[background-color,box-shadow] duration-150 focus-visible:shadow-[var(--focus-ring)]",
          open && "bg-[var(--ios-fill-secondary)] shadow-[var(--focus-ring)]",
        )}
      >
        <Bell className="size-4 stroke-[1.75]" aria-hidden />
        <NotificationCountBadge
          count={count}
          className="absolute -right-0.5 -top-0.5"
        />
      </button>
      {layer}
    </div>
  );
}
