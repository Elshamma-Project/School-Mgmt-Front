"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

const TIP_COUNT = 8;
const FIRST_ROTATE_MS = 1_600;
const ROTATE_EVERY_MS = 2_800;
const FADE_MS = 180;

type EngagingLoadingCopyProps = {
  /** Affiché immédiatement (ex. « Ouverture de la session »). */
  title?: string;
  /** Sous-titre initial avant la rotation des tips. */
  initialHint?: string;
  /** Démarre la rotation uniquement quand true. */
  active?: boolean;
  /**
   * Clé sous `common` pour les tips rotatifs (`loadingTips` | `logoutTips`).
   * Doit contenir 0..tipCount-1.
   */
  tipsKey?: "loadingTips" | "logoutTips";
  tipCount?: number;
  className?: string;
  titleClassName?: string;
  hintClassName?: string;
};

/**
 * Titre + hints qui tournent quand le chargement dure (sans erreur).
 * Textes scolaires — FR/EN via `common.loadingTips` / `common.logoutTips`.
 */
export function EngagingLoadingCopy({
  title,
  initialHint,
  active = true,
  tipsKey = "loadingTips",
  tipCount = TIP_COUNT,
  className,
  titleClassName,
  hintClassName,
}: EngagingLoadingCopyProps) {
  const t = useTranslations("common");
  const [tipIndex, setTipIndex] = useState<number | null>(null);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (!active) {
      setTipIndex(null);
      setFade(true);
      return;
    }

    const timers: number[] = [];
    const beginRotation = () => {
      setTipIndex(0);
      setFade(true);
      const rotateTimer = window.setInterval(() => {
        setFade(false);
        const swap = window.setTimeout(() => {
          setTipIndex((prev) => ((prev ?? 0) + 1) % tipCount);
          setFade(true);
        }, FADE_MS);
        timers.push(swap);
      }, ROTATE_EVERY_MS);
      timers.push(rotateTimer);
    };

    // Avec hint initial : laisser le temps de le lire, sinon tip tout de suite.
    if (initialHint) {
      timers.push(window.setTimeout(beginRotation, FIRST_ROTATE_MS));
    } else {
      beginRotation();
    }

    return () => {
      for (const id of timers) {
        window.clearTimeout(id);
        window.clearInterval(id);
      }
    };
  }, [active, initialHint, tipCount]);

  const hint =
    tipIndex === null
      ? initialHint
      : t(`${tipsKey}.${tipIndex}` as `${typeof tipsKey}.0`);

  return (
    <div className={cn("text-center", className)}>
      {title ? (
        <p
          className={cn(
            "text-[var(--text-body)] font-semibold tracking-[-0.01em] text-[var(--ios-label)]",
            titleClassName,
          )}
        >
          {title}
        </p>
      ) : null}
      {hint ? (
        <p
          className={cn(
            "max-w-[36ch] text-[var(--text-footnote)] leading-relaxed text-[var(--ios-secondary-label)] transition-opacity duration-200",
            title ? "mt-1.5" : null,
            fade ? "opacity-100" : "opacity-0",
            hintClassName,
          )}
          aria-live="polite"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
