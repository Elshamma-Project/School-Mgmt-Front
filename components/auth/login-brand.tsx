"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BrandMark } from "@/components/layout/brand-mark";
import { useSchoolBrandStore } from "@/stores/school-brand-store";

type LoginBrandProps = {
  schoolId: string;
};

/** Logo + nom établissement sur l’écran de connexion (API publique). */
export function LoginBrand({ schoolId }: LoginBrandProps) {
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const hydratePublic = useSchoolBrandStore((s) => s.hydratePublic);
  const displayName = useSchoolBrandStore((s) => s.displayName);
  const school = useSchoolBrandStore((s) => s.school);

  useEffect(() => {
    void hydratePublic(schoolId || null);
  }, [hydratePublic, schoolId]);

  const name = school ? displayName(locale) : tCommon("schoolName");

  return (
    <div className="mb-8 flex w-full max-w-[380px] flex-col items-center text-center">
      <BrandMark size="lg" alt={name || tCommon("schoolName")} className="mb-4" />
      <p className="text-[var(--text-footnote)] font-semibold uppercase tracking-[0.12em] text-[var(--ios-secondary-label)]">
        {name || tCommon("schoolName")}
      </p>
      <h1 className="mt-2 text-[var(--text-title1)] font-bold tracking-[-0.03em] text-[var(--ios-label)]">
        {tCommon("appName")}
      </h1>
    </div>
  );
}
