"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ParentChildSwitcher } from "@/components/parent/parent-child-switcher";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  HubLoadingRows,
  HubTableShell,
  HubYearBanner,
} from "@/components/workspace/hub-chrome";
import { listAcademicYears, type AcademicYearResponse } from "@/lib/api/academic";
import {
  downloadReportCardPdf,
  listReportCardsForStudent,
  type ReportCardSummaryResponse,
} from "@/lib/api/reporting";
import { formatMark } from "@/lib/grading/marks";
import { useParentChildren } from "@/lib/parent/use-parent-children";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { ApiError, isAuthFailure } from "@/types/api";

/** Bulletins annuels publiés des enfants (`canDownloadReportCards`). */
export function ParentReportCardsView() {
  const t = useTranslations("parentSpace");
  const tHub = useTranslations("gradesHub");
  const locale = useLocale();

  const {
    schoolId,
    guardianId,
    loading: childrenLoading,
    children,
    selected,
    selectedId,
    setSelectedId,
    canDownloadReportCards,
  } = useParentChildren();

  const [year, setYear] = useState<AcademicYearResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReportCardSummaryResponse[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const years = await listAcademicYears({ page: 0, size: 20, schoolId });
        if (cancelled) return;
        setYear(
          years.content.find((y) => y.current) ??
            years.content.find((y) => y.status === "ACTIVE") ??
            years.content[0] ??
            null,
        );
      } catch (err) {
        if (isAuthFailure(err)) return;
        if (!cancelled) setYear(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  useEffect(() => {
    if (!selected || !canDownloadReportCards) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const cards = await listReportCardsForStudent(selected.id, {
          academicYearId: year?.id ?? null,
          schoolId,
        });
        if (cancelled) return;
        setRows(
          cards.filter(
            (c) => c.status === "PUBLISHED" && c.periodType === "ANNUAL",
          ),
        );
      } catch (err) {
        if (isAuthFailure(err)) return;
        if (!cancelled) {
          setRows([]);
          notify.error(
            err instanceof ApiError && err.message ? err.message : t("loadError"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, year, schoolId, canDownloadReportCards, t]);

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          b.revision - a.revision ||
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
      ),
    [rows],
  );

  const onDownload = async (card: ReportCardSummaryResponse) => {
    setDownloading(card.id);
    try {
      const blob = await downloadReportCardPdf(card.id, schoolId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      if (isAuthFailure(err)) return;
      notify.error(t("reportCards.pdfError"));
    } finally {
      setDownloading(null);
    }
  };

  if (!guardianId) {
    return (
      <div className="space-y-5 slide-up">
        <PageHeader description={t("reportCards.description")} />
        <EmptyState
          title={t("noProfileTitle")}
          description={t("noProfileDescription")}
          icon={<FileSpreadsheet className="size-9 stroke-[1.5]" aria-hidden />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 slide-up">
      <PageHeader description={t("reportCards.description")} />

      <HubYearBanner
        label={t("yearLabel")}
        yearLabel={year?.label ?? null}
        yearStatus={year?.status ?? null}
        yearStatusLabel={
          year?.status && tHub.has(`yearStatus.${year.status}`)
            ? tHub(`yearStatus.${year.status}`)
            : year?.status
        }
        yearLocked={Boolean(year?.locked)}
        lockedLabel={null}
        hint={t("reportCards.hint")}
        loading={childrenLoading}
        emptyLabel={t("yearEmpty")}
      />

      {childrenLoading ? (
        <HubLoadingRows />
      ) : children.length === 0 ? (
        <EmptyState
          title={t("children.emptyTitle")}
          description={t("children.emptyDescription")}
          icon={<FileSpreadsheet className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : (
        <>
          <ParentChildSwitcher
            childrenList={children}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {!canDownloadReportCards ? (
            <Alert
              tone="warning"
              title={t("reportCards.forbiddenTitle")}
              description={t("reportCards.forbiddenBody")}
            />
          ) : loading ? (
            <HubLoadingRows />
          ) : sorted.length === 0 ? (
            <EmptyState
              title={t("reportCards.emptyTitle")}
              description={t("reportCards.emptyDescription")}
              icon={<FileSpreadsheet className="size-9 stroke-[1.5]" aria-hidden />}
            />
          ) : (
            <HubTableShell
              countLabel={t("reportCards.tableCount", { count: sorted.length })}
            >
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                    <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("reportCards.columns.period")}
                    </th>
                    <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("reportCards.columns.average")}
                    </th>
                    <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("reportCards.columns.rank")}
                    </th>
                    <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("reportCards.columns.status")}
                    </th>
                    <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("reportCards.columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((card, index) => (
                    <tr
                      key={card.id}
                      className={cn(
                        "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                        index % 2 === 1 &&
                          "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                      )}
                    >
                      <td className="px-5 py-3.5 text-[13px] font-medium text-[var(--ios-label)]">
                        {t("reportCards.annual")}
                        <span className="mt-0.5 block text-[11px] font-normal text-[var(--ios-secondary-label)]">
                          {t("reportCards.revision", { revision: card.revision })}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 tabular-nums text-[13px]">
                        {formatMark(card.average, locale) || "—"}
                      </td>
                      <td className="px-3 py-3.5 tabular-nums text-[13px]">
                        {card.rank ?? "—"}
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge tone="success">{t("reportCards.published")}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          leadingIcon={<FileDown className="size-3.5" aria-hidden />}
                          disabled={downloading === card.id}
                          onClick={() => void onDownload(card)}
                        >
                          {downloading === card.id
                            ? t("reportCards.downloading")
                            : t("reportCards.download")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </HubTableShell>
          )}
        </>
      )}
    </div>
  );
}
