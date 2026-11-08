"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, DoorOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import {
  HubLoadingRows,
  HubStatusPill,
  HubTableShell,
  HubToolbar,
  HubYearBanner,
} from "@/components/workspace/hub-chrome";
import { useRouter } from "@/i18n/navigation";
import { listAcademicYears, listRooms, type RoomResponse } from "@/lib/api/academic";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import {
  moduleListPath,
  parseTimetableTab,
  TIMETABLE_TABS,
  type TimetableTab,
} from "@/lib/modules/tabs";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

/** Hub emploi du temps — salles déjà branchées ; grille/emploi = prochaine étape API. */
export function TimetableHubView() {
  const t = useTranslations("timetableHub");
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const role = primaryRole(useAuthStore((s) => s.user));
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";

  const tab = parseTimetableTab(searchParams.get("tab"));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [yearLabel, setYearLabel] = useState<string | null>(null);
  const [yearStatus, setYearStatus] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);

  const selectTab = (next: TimetableTab) => {
    router.replace(moduleListPath(workspaceHome, "timetable", next, "overview"));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [years, roomsPage] = await Promise.all([
        listAcademicYears({ page: 0, size: 20, schoolId }),
        listRooms({ page: 0, size: 100, schoolId }),
      ]);
      const year =
        years.content.find((y) => y.current) ??
        years.content.find((y) => y.status === "ACTIVE") ??
        years.content[0] ??
        null;
      setYearLabel(year?.label ?? null);
      setYearStatus(year?.status ?? null);
      setRooms(roomsPage.content);
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const filteredRooms = useMemo(() => {
    if (!q) return rooms;
    return rooms.filter(
      (r) => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q),
    );
  }, [q, rooms]);

  return (
    <div className="space-y-5 slide-up">
      <HubYearBanner
        label={t("yearLabel")}
        yearLabel={yearLabel}
        yearStatus={yearStatus}
        yearStatusLabel={
          yearStatus && t.has(`yearStatus.${yearStatus}`)
            ? t(`yearStatus.${yearStatus}`)
            : yearStatus
        }
        hint={t("yearHint")}
        loading={loading}
        emptyLabel={t("yearEmpty")}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <StatCard
          label={t("stats.overview")}
          value={0}
          loading={loading}
          tone="blue"
          active={tab === "overview"}
          onSelect={() => selectTab("overview")}
          icon={<CalendarDays className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.rooms")}
          value={rooms.filter((r) => r.active).length}
          loading={loading}
          tone="green"
          active={tab === "rooms"}
          onSelect={() => selectTab("rooms")}
          icon={<DoorOpen className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
      </div>

      <HubToolbar
        tabs={TIMETABLE_TABS.map((key) => ({ key, label: t(`tabs.${key}`) }))}
        activeTab={tab}
        onTabChange={(key) => selectTab(key as TimetableTab)}
        tabsAriaLabel={t("tabsNav")}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={t(`search.${tab}`)}
      />

      {loading ? (
        <HubLoadingRows />
      ) : tab === "overview" ? (
        <EmptyState
          title={t("empty.overview.title")}
          description={t("empty.overview.description")}
          icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : filteredRooms.length === 0 ? (
        <EmptyState
          title={t("empty.rooms.title")}
          description={t("empty.rooms.description")}
          icon={<DoorOpen className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : (
        <HubTableShell countLabel={t("tableCount", { count: filteredRooms.length })}>
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.name")}
                </th>
                <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.type")}
                </th>
                <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.capacity")}
                </th>
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((item, index) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                    index % 2 === 1 &&
                      "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                  )}
                >
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                    {item.name}
                  </td>
                  <td className="px-3 py-3.5 text-[12px] text-[var(--ios-label)]">{item.type}</td>
                  <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                    {item.capacity ?? "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <HubStatusPill
                      active={item.active}
                      activeLabel={t("statusActive")}
                      inactiveLabel={t("inactive")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </HubTableShell>
      )}
    </div>
  );
}
