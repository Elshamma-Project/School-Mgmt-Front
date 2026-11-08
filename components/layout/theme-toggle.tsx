"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { useThemeStore } from "@/stores/theme-store";

type ThemeToggleProps = {
  className?: string;
};

/** Bascule clair / sombre — icône soleil ou lune. */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const t = useTranslations("common");
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const isDark = ready && theme === "dark";
  const label = isDark ? t("themeToLight") : t("themeToDark");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        "pressable inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] bg-[var(--ios-fill)] text-[var(--ios-label)] transition-[background-color,box-shadow,color] duration-[var(--duration-fast)] hover:bg-[var(--ios-fill-secondary)] focus-visible:shadow-[var(--focus-ring)]",
        className,
      )}
    >
      {isDark ? (
        <Sun className="size-4 stroke-[1.75]" aria-hidden />
      ) : (
        <Moon className="size-4 stroke-[1.75]" aria-hidden />
      )}
    </button>
  );
}
