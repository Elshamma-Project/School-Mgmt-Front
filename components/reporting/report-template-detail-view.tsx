"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BulletinTemplatePreview } from "@/components/reporting/bulletin-template-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { localizedLabel } from "@/lib/api/academic";
import {
  downloadReportTemplateSamplePdf,
  getReportTemplate,
  type ReportTemplateResponse,
} from "@/lib/api/reporting";
import { moduleListPath } from "@/lib/modules/tabs";
import { notify } from "@/lib/ui/notify";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { useAuthStore } from "@/stores/auth-store";
import { useSchoolBrandStore } from "@/stores/school-brand-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

type ReportTemplateDetailViewProps = {
  code: string;
};

export function ReportTemplateDetailView({ code }: ReportTemplateDetailViewProps) {
  const t = useTranslations("reportingHub");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const role = primaryRole(useAuthStore((s) => s.user));
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";
  const school = useSchoolBrandStore((s) => s.school);
  const hydrate = useSchoolBrandStore((s) => s.hydrate);

  const [template, setTemplate] = useState<ReportTemplateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<"FR" | "EN">("FR");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    void hydrate(schoolId ?? null, locale);
  }, [hydrate, locale, schoolId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getReportTemplate(code, schoolId)
      .then((row) => {
        if (!cancelled) setTemplate(row);
      })
      .catch((error) => {
        if (cancelled || isAuthFailure(error)) return;
        if (error instanceof ApiError) notify.error(error.message);
        else notify.error(t("templates.loadError"));
        setTemplate(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code, schoolId, t]);

  const header = useMemo(
    () => school?.officialHeaders?.[0] ?? null,
    [school],
  );

  async function onDownloadPdf() {
    if (!template || downloading) return;
    setDownloading(true);
    try {
      const blob = await downloadReportTemplateSamplePdf(template.code, {
        schoolId,
        language,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bulletin-${template.code.toLowerCase()}-${language.toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success(t("templates.pdfSuccess"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(t("templates.pdfError"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-5 slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link
            href={moduleListPath(workspaceHome, "reporting", "templates", "templates")}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--ios-blue)]"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {t("templates.back")}
          </Link>
          {loading ? (
            <Skeleton className="h-7 w-56" />
          ) : template ? (
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[20px] font-bold tracking-[-0.02em] text-[var(--ios-label)]">
                {localizedLabel(template.name, locale)}
              </h1>
              <Badge tone={template.active ? "success" : "neutral"}>
                {template.active ? t("statusActive") : t("inactive")}
              </Badge>
              <Badge tone="blue">{template.periodType}</Badge>
            </div>
          ) : (
            <h1 className="text-[20px] font-bold text-[var(--ios-label)]">{code}</h1>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-[var(--radius-md)] border border-[var(--ios-separator)] p-0.5">
            {(["FR", "EN"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={
                  language === lang
                    ? "rounded-[var(--radius-sm)] bg-[var(--ios-blue)] px-2.5 py-1 text-[11px] font-semibold text-white"
                    : "px-2.5 py-1 text-[11px] font-semibold text-[var(--ios-secondary-label)]"
                }
              >
                {lang}
              </button>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={!template || downloading}
            onClick={() => void onDownloadPdf()}
          >
            <Download className="size-3.5" aria-hidden />
            {downloading ? tCommon("loading") : t("templates.downloadPdf")}
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-[520px] w-full rounded-[var(--radius-lg)]" />
      ) : !template ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)] bg-[var(--ios-card)] px-5 py-10 text-center">
          <FileSpreadsheet className="mx-auto size-9 text-[var(--ios-secondary-label)]" />
          <p className="mt-3 text-[14px] font-semibold text-[var(--ios-label)]">
            {t("templates.notFound")}
          </p>
        </div>
      ) : (
        <BulletinTemplatePreview
          template={template}
          language={language}
          schoolNameFr={school?.name.fr || school?.shortName || "École"}
          schoolNameEn={school?.name.en || school?.shortName || "School"}
          postalBox={school?.postalBox || ""}
          phones={school?.contact.phones || []}
          header={header}
        />
      )}
    </div>
  );
}
