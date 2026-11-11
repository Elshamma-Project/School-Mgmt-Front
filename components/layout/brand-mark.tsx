"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils/cn";
import {
  peekSchoolLogoUrl,
  subscribeSchoolLogoCache,
} from "@/lib/school/logo-cache";
import { useSchoolBrandStore } from "@/stores/school-brand-store";

type BrandMarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  alt?: string;
};

const SIZE_CLASS = {
  sm: "size-8",
  md: "size-10",
  lg: "size-[72px]",
  xl: "size-24",
} as const;

const FALLBACK =
  process.env.NEXT_PUBLIC_SCHOOL_LOGO_URL?.trim() || "/brand/el-shammah-logo.svg";

/**
 * Logo école : logo paramétré (blob cache) sinon fichier de marque local.
 */
export function BrandMark({
  className,
  size = "md",
  alt = "El Shammah",
}: BrandMarkProps) {
  const schoolId = useSchoolBrandStore((s) => s.school?.id ?? null);
  const storeLogoUrl = useSchoolBrandStore((s) => s.logoUrl);
  const cached = useSyncExternalStore(
    subscribeSchoolLogoCache,
    () => peekSchoolLogoUrl(schoolId),
    () => null,
  );
  const src = storeLogoUrl || cached || FALLBACK;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob / SVG branding sans config remote
    <img
      src={src}
      alt={alt}
      width={size === "xl" ? 96 : size === "lg" ? 72 : size === "md" ? 40 : 32}
      height={size === "xl" ? 96 : size === "lg" ? 72 : size === "md" ? 40 : 32}
      decoding="async"
      className={cn(
        "shrink-0 rounded-full bg-[var(--ios-card)] object-cover shadow-[var(--ios-shadow-sm)] ring-1 ring-[var(--ios-separator)]",
        SIZE_CLASS[size],
        className,
      )}
    />
  );
}
