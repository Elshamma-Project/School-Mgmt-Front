import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

type LocaleFlagProps = {
  locale: AppLocale;
  className?: string;
};

/** Drapeaux SVG (fiables sous Windows, où les emoji 🇫🇷/🇬🇧 ne s’affichent souvent pas). */
export function LocaleFlag({ locale, className }: LocaleFlagProps) {
  const common = cn(
    "inline-block h-[0.8125rem] w-[1.21875rem] shrink-0 overflow-hidden rounded-[1px] align-[-0.05em] shadow-[0_0_0_1px_var(--ios-separator)]",
    className,
  );

  if (locale === "fr") {
    return (
      <svg
        width={13}
        height={9}
        viewBox="0 0 3 2"
        className={common}
        aria-hidden
        focusable="false"
      >
        <rect width="1" height="2" x="0" fill="#002395" />
        <rect width="1" height="2" x="1" fill="#fff" />
        <rect width="1" height="2" x="2" fill="#ed2939" />
      </svg>
    );
  }

  return (
    <svg
      width={13}
      height={9}
      viewBox="0 0 60 30"
      className={common}
      aria-hidden
      focusable="false"
    >
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0 L60 30 M60 0 L0 30" stroke="#fff" strokeWidth="6" />
      <path d="M0 0 L60 30 M60 0 L0 30" stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0 V30 M0 15 H60" stroke="#fff" strokeWidth="10" />
      <path d="M30 0 V30 M0 15 H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}
