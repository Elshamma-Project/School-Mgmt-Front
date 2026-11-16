"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/layout/brand-mark";
import { EngagingLoadingCopy } from "@/components/ui/engaging-loading-copy";
import { Spinner } from "@/components/ui/spinner";

type LogoutLoadingProps = {
  open: boolean;
};

/** Overlay plein écran pendant la déconnexion (session, jetons, redirection login). */
export function LogoutLoading({ open }: LogoutLoadingProps) {
  const t = useTranslations("auth");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        document.body.style.overflow = "";
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[color-mix(in_srgb,var(--ios-bg)_92%,transparent)] px-6 backdrop-blur-xl fade-in"
    >
      <div className="flex w-full max-w-[300px] flex-col items-center text-center">
        <div className="relative">
          <BrandMark size="xl" />
          <span className="absolute -inset-4 rounded-full border border-[var(--ios-secondary-label)]/20 animate-[bee-sm-spin_1.4s_linear_infinite]" />
        </div>

        <Spinner size="lg" tone="default" className="mt-8" label={t("logoutSubmitting")} />

        <EngagingLoadingCopy
          className="mt-5 flex flex-col items-center"
          active={open}
          tipsKey="logoutTips"
          title={t("logoutPreparing")}
          initialHint={t("logoutPreparingHint")}
        />
      </div>
    </div>,
    document.body,
  );
}
