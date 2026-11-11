"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/layout/brand-mark";
import { Spinner } from "@/components/ui/spinner";

type LoginLoadingProps = {
  open: boolean;
  roleLabel?: string;
};

/** Overlay plein écran pendant la connexion (démo / futur API). */
export function LoginLoading({ open, roleLabel }: LoginLoadingProps) {
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

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[color-mix(in_srgb,var(--ios-bg)_92%,transparent)] px-6 backdrop-blur-xl fade-in"
    >
      <div className="flex w-full max-w-[280px] flex-col items-center text-center">
        <div className="relative">
          <BrandMark size="xl" />
          <span className="absolute -inset-4 rounded-full border border-[var(--ios-blue)]/25 animate-[smels-spin_1.4s_linear_infinite]" />
        </div>

        <Spinner size="lg" tone="blue" className="mt-8" label={t("submitting")} />

        <p className="mt-5 text-[var(--text-body)] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
          {t("loginPreparing")}
        </p>
        <p className="mt-1.5 text-[var(--text-footnote)] leading-relaxed text-[var(--ios-secondary-label)]">
          {roleLabel ? t("loginPreparingRole", { role: roleLabel }) : t("loginPreparingHint")}
        </p>
      </div>
    </div>,
    document.body,
  );
}
