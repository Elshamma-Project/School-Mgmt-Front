"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import {
  academicListPath,
  type AcademicTab,
} from "@/lib/academic/tabs";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { useAuthStore } from "@/stores/auth-store";
import { usePageHeadingStore } from "@/stores/page-heading-store";
import { primaryRole } from "@/types/auth";

type AcademicCreateViewProps = {
  tab: AcademicTab;
};

/**
 * Point d’entrée création académique.
 * Les formulaires détaillés (niveau / classe / matière…) suivront le même schéma
 * que `/staff/create` ; le hub liste déjà les référentiels.
 */
export function AcademicCreateView({ tab }: AcademicCreateViewProps) {
  const t = useTranslations("academic");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const role = primaryRole(useAuthStore((s) => s.user));
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";
  const setCrumbs = usePageHeadingStore((s) => s.setCrumbs);
  const setBackHref = usePageHeadingStore((s) => s.setBackHref);
  const clearOverride = usePageHeadingStore((s) => s.clearOverride);

  const listHref = academicListPath(workspaceHome, tab);

  useEffect(() => {
    setBackHref(listHref);
    setCrumbs([
      { label: tNav("academic"), href: academicListPath(workspaceHome, "levels") },
      { label: t(`tabs.${tab}`), href: listHref },
      { label: t(`add.${tab}`) },
    ]);
    return () => clearOverride();
  }, [clearOverride, listHref, setBackHref, setCrumbs, t, tNav, tab, workspaceHome]);

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 slide-up">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
          {t(`add.${tab}`)}
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ios-secondary-label)]">
          {t("createComingSoon")}
        </p>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] px-5 py-5 shadow-[var(--ios-shadow)] sm:px-6">
        <p className="text-[13px] leading-relaxed text-[var(--ios-secondary-label)]">
          {t(`createHints.${tab}`)}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => router.push(listHref)}>
            {tCommon("cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
