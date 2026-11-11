"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BulletinTemplatePreview } from "@/components/reporting/bulletin-template-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listAcademicYears, localizedLabel } from "@/lib/api/academic";
import {
  downloadReportTemplateSamplePdf,
  getReportTemplate,
  type ReportTemplateResponse,
} from "@/lib/api/reporting";
import { getMySchool, type SchoolResponse } from "@/lib/api/school";
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
  const setSchool = useSchoolBrandStore((s) => s.setSchool);
  const refreshLogo = useSchoolBrandStore((s) => s.refreshLogo);

  const [template, setTemplate] = useState<ReportTemplateResponse | null>(null);
  const [school, setLocalSchool] = useState<SchoolResponse | null>(null);
  const [yearLabel, setYearLabel] = useState<string | null>(null);
  const [termNumber, setTermNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<"FR" | "EN">("FR");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      getReportTemplate(code, schoolId),
      getMySchool(schoolId),
      listAcademicYears({ page: 0, size: 20, schoolId }),
    ])
      .then(([row, schoolRow, years]) => {
        if (cancelled) return;
        setTemplate(row);
        setLocalSchool(schoolRow);
        if (schoolRow) {
          setSchool(schoolRow);
          void refreshLogo();
        }
        const year =
          years.content.find((y) => y.current) ??
          years.content.find((y) => y.status === "ACTIVE") ??
          years.content[0] ??
          null;
        setYearLabel(year?.label ?? null);
        const today = new Date().toISOString().slice(0, 10);
        const activeTerm =
          year?.terms.find((term) => term.startDate <= today && today <= term.endDate) ??
          year?.terms[0] ??
          null;
        setTermNumber(activeTerm?.number ?? 1);
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
  }, [code, schoolId, refreshLogo, setSchool, t]);

  /** En-tête officiel école (cycle secondaire en priorité). */
  const header = useMemo(() => {
    const headers = school?.officialHeaders ?? [];
    if (headers.length === 0) return null;
    return (
      headers.find((h) => h.cycles.some((c) => c === "SECONDARY" || c === "SECONDARY_GENERAL")) ??
      headers[0] ??
      null
    );
  }, [school]);

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
          schoolNameFr={school?.name.fr || school?.shortName || ""}
          schoolNameEn={school?.name.en || school?.shortName || ""}
          postalBox={school?.postalBox || ""}
          phones={school?.contact.phones || []}
          header={header}
          yearLabel={yearLabel ?? undefined}
          termNumber={termNumber}
        />
      )}
    </div>
  );
}
