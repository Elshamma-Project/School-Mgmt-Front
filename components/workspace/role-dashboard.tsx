"use client";

import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileSpreadsheet,
  GraduationCap,
  Lock,
  PenLine,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, type StatTone } from "@/components/ui/stat-card";
import { Link, useRouter } from "@/i18n/navigation";
import { getNavItemsForRole } from "@/lib/auth/nav-config";
import { isComingSoonRole } from "@/lib/auth/mock-users";
import { cn } from "@/lib/utils/cn";
import {
  useDashboardData,
  type DashboardStatKey,
} from "@/lib/workspace/use-dashboard-data";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

function localized(
  text: { fr: string | null; en: string | null },
  locale: string,
): string {
  if (locale.startsWith("en")) return text.en || text.fr || "—";
  return text.fr || text.en || "—";
}

const STAT_META: Record<
  DashboardStatKey,
  { icon: LucideIcon; tone: StatTone }
> = {
  students: { icon: GraduationCap, tone: "blue" },
  staff: { icon: Users, tone: "slate" },
  enrolled: { icon: BookOpen, tone: "green" },
  openSessions: { icon: ClipboardList, tone: "green" },
  assignments: { icon: PenLine, tone: "blue" },
  weeklyHours: { icon: Clock3, tone: "slate" },
  unread: { icon: Bell, tone: "amber" },
  pendingSheets: { icon: FileSpreadsheet, tone: "amber" },
  pendingCorrections: { icon: AlertTriangle, tone: "amber" },
};

const MODULE_ACCENTS = [
  "bg-[color-mix(in_srgb,var(--ios-blue)_12%,transparent)] text-[var(--ios-blue)]",
  "bg-[color-mix(in_srgb,var(--ios-success)_12%,transparent)] text-[var(--ios-success)]",
  "bg-[color-mix(in_srgb,var(--ios-warning)_14%,transparent)] text-[var(--ios-warning)]",
  "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
];

const CYCLE_LABEL_KEYS = [
  "MATERNELLE",
  "PRIMAIRE",
  "SECONDAIRE_1ER_CYCLE",
  "SECONDAIRE_2ND_CYCLE",
] as const;

export function RoleDashboard() {
  const t = useTranslations("home");
  const tNav = useTranslations("nav");
  const tRoles = useTranslations("roles");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const isMock = useAuthStore((s) => s.isMock);
  const role = primaryRole(user);
  const roles = user?.roles?.length ? user.roles : role ? [role] : [];

  const data = useDashboardData({
    role,
    roles,
    schoolId: user?.schoolId,
    profileId: user?.profileId,
  });

  if (!role) return null;

  const greetingName = user?.displayName ?? user?.username ?? "";
  const navItems = getNavItemsForRole(role);
  const modules = navItems.filter(
    (item) => item.key !== "home" && item.key !== "settings" && item.key !== "notifications",
  );
  const notificationsHref =
    (navItems.find((n) => n.key === "notifications")?.href ??
      "/notifications") as `/${string}`;

  const breakdown = data.sessionBreakdown;
  const hasSessionsChart = breakdown.total > 0;
  const summary = data.summary;
  const entry = summary?.entryProgress;
  const enrollments = summary?.enrollments;
  const sheets = summary?.reportSheets;
  const deadlines = summary?.sessions?.upcomingDeadlines ?? [];
  const openSessions = summary?.sessions?.openSessions ?? [];
  const recent = summary?.notifications.recent ?? [];
  const maxCycle = Math.max(1, ...(enrollments?.byCycle.map((c) => c.enrolledCount) ?? [1]));

  return (
    <div className="space-y-6 slide-up">
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/50 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
          style={{
            background:
              "radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--ios-blue) 18%, transparent), transparent 55%), radial-gradient(90% 70% at 100% 10%, color-mix(in srgb, var(--ios-success) 12%, transparent), transparent 50%), linear-gradient(180deg, color-mix(in srgb, var(--ios-fill) 35%, transparent), transparent 70%)",
          }}
        />
        <div className="relative flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-[var(--text-title2)] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
              {t("greeting", { name: greetingName })}
            </p>
            <p className="max-w-xl text-[var(--text-subhead)] leading-relaxed text-[var(--ios-secondary-label)]">
              {tRoles(`${role}.homeBlurb`)}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge tone="blue">{tRoles(`${role}.label`)}</Badge>
              {isMock ? <Badge tone="neutral">{tCommon("demoBadge")}</Badge> : null}
              {data.yearLabel ? (
                <Badge tone={data.yearLocked ? "warning" : "success"}>
                  {data.yearLabel}
                  {data.yearLocked ? ` · ${t("yearLockedShort")}` : ""}
                </Badge>
              ) : null}
            </div>
          </div>
          {user?.username ? (
            <div className="shrink-0 rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/45 bg-[color-mix(in_srgb,var(--ios-card)_82%,transparent)] px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-tertiary-label)]">
                {t("accountLabel")}
              </p>
              <p className="mt-0.5 truncate text-[var(--text-body)] font-medium text-[var(--ios-label)]">
                {user.username}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {isComingSoonRole(role) ? (
        <Alert
          tone="warning"
          title={tRoles(`${role}.comingSoonTitle`)}
          description={tRoles(`${role}.comingSoonBody`)}
        />
      ) : null}

      {!data.loading && data.attention.length > 0 ? (
        <section className="flex flex-wrap gap-2">
          {data.attention.map((item) => {
            const label =
              item.kind === "yearLocked"
                ? t("attention.yearLocked")
                : t(`attention.${item.kind}`, { count: item.count ?? 0 });
            const tone =
              item.kind === "yearLocked" ||
              item.kind === "corrections" ||
              item.kind === "deadline"
                ? "danger"
                : item.kind === "sheets" || item.kind === "unread"
                  ? "warning"
                  : "blue";
            const Icon =
              item.kind === "yearLocked"
                ? Lock
                : item.kind === "unread"
                  ? Bell
                  : item.kind === "sheets"
                    ? FileSpreadsheet
                    : item.kind === "corrections"
                      ? AlertTriangle
                      : item.kind === "deadline"
                        ? CalendarClock
                        : CheckCircle2;
            const chip = (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[var(--text-footnote)] font-medium",
                  tone === "danger" &&
                    "bg-[var(--ios-danger-soft)] text-[var(--ios-danger)]",
                  tone === "warning" &&
                    "bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]",
                  tone === "blue" &&
                    "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]",
                )}
              >
                <Icon className="size-3.5 stroke-[1.75]" aria-hidden />
                {label}
              </span>
            );
            return item.href ? (
              <Link key={item.id} href={item.href} className="pressable">
                {chip}
              </Link>
            ) : (
              <span key={item.id}>{chip}</span>
            );
          })}
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-tertiary-label)]">
          {t("statsSection")}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {data.loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <StatCard
                  key={i}
                  label="…"
                  value={0}
                  icon={<Skeleton className="size-5 rounded-full" />}
                  tone="slate"
                  loading
                />
              ))
            : data.stats.map((stat) => {
                const meta = STAT_META[stat.key];
                const Icon = meta.icon;
                return (
                  <StatCard
                    key={stat.key}
                    label={t(`stats.${stat.key}`)}
                    value={stat.value}
                    tone={meta.tone}
                    icon={<Icon className="size-5 stroke-[1.75]" aria-hidden />}
                    onSelect={stat.href ? () => router.push(stat.href!) : undefined}
                  />
                );
              })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow)] lg:col-span-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-tertiary-label)]">
            {t("sessionsChartTitle")}
          </h2>
          {data.loading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : hasSessionsChart ? (
            <div className="mt-4 space-y-4">
              <div
                className="flex h-3 overflow-hidden rounded-full bg-[var(--ios-fill)]"
                role="img"
                aria-label={t("sessionsChartAria", {
                  open: breakdown.open,
                  closed: breakdown.closed,
                  planned: breakdown.planned,
                })}
              >
                {breakdown.open > 0 ? (
                  <span
                    className="bg-[var(--ios-success)]"
                    style={{ width: `${(breakdown.open / breakdown.total) * 100}%` }}
                  />
                ) : null}
                {breakdown.closed > 0 ? (
                  <span
                    className="bg-[var(--ios-blue)]"
                    style={{ width: `${(breakdown.closed / breakdown.total) * 100}%` }}
                  />
                ) : null}
                {breakdown.planned > 0 ? (
                  <span
                    className="bg-[var(--ios-fill-tertiary)]"
                    style={{ width: `${(breakdown.planned / breakdown.total) * 100}%` }}
                  />
                ) : null}
              </div>
              <ul className="space-y-2.5">
                {(
                  [
                    ["open", breakdown.open, "bg-[var(--ios-success)]"],
                    ["closed", breakdown.closed, "bg-[var(--ios-blue)]"],
                    ["planned", breakdown.planned, "bg-[var(--ios-fill-tertiary)]"],
                  ] as const
                ).map(([key, value, color]) => (
                  <li key={key} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                      <span className={cn("size-2.5 rounded-full", color)} aria-hidden />
                      {t(`sessionStatus.${key}`)}
                    </span>
                    <span className="tabular-nums text-[var(--text-body)] font-semibold text-[var(--ios-label)]">
                      {value}
                    </span>
                  </li>
                ))}
              </ul>
              {openSessions.length > 0 ? (
                <div className="border-t border-[var(--ios-separator)]/45 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-tertiary-label)]">
                    {t("openSessionsList")}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {openSessions.slice(0, 4).map((session) => (
                      <li
                        key={session.id}
                        className="flex items-center justify-between gap-2 text-[var(--text-footnote)]"
                      >
                        <span className="truncate text-[var(--ios-label)]">
                          {session.shortLabel ||
                            (session.name ? localized(session.name, locale) : `DEV${session.number}`)}
                        </span>
                        <Badge tone="success">{t("sessionStatus.open")}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-[var(--text-subhead)] text-[var(--ios-secondary-label)]">
              {t("sessionsChartEmpty")}
            </p>
          )}
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow)] lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-tertiary-label)]">
              {t("activitySection")}
            </h2>
            <Link
              href={notificationsHref}
              className="pressable text-[var(--text-footnote)] font-medium text-[var(--ios-blue)]"
            >
              {t("activitySeeAll")}
            </Link>
          </div>
          {data.loading ? (
            <div className="mt-3 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-[var(--radius-md)]" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="mt-4 text-[var(--text-subhead)] text-[var(--ios-secondary-label)]">
              {t("activityEmpty")}
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--ios-separator)]/40">
              {recent.map((row) => (
                <li key={row.id}>
                  <Link
                    href={notificationsHref}
                    className="pressable flex items-start gap-3 py-3 first:pt-2 last:pb-0"
                  >
                    <span
                      className={cn(
                        "mt-1 size-2 shrink-0 rounded-full",
                        row.unread
                          ? "bg-[var(--ios-blue)]"
                          : "bg-[var(--ios-fill-tertiary)]",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[var(--text-body)] font-medium text-[var(--ios-label)]">
                        {localized(row.title, locale)}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                        {localized(row.body, locale)}
                      </p>
                    </div>
                    <ChevronRight
                      className="mt-1 size-4 shrink-0 stroke-[1.75] text-[var(--ios-tertiary-label)]"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {(entry || sheets || enrollments || deadlines.length > 0) && !data.loading ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entry ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow)]">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-tertiary-label)]">
                {t("entryProgressTitle")}
              </h2>
              <p className="mt-3 text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-[var(--ios-label)]">
                {Math.round(entry.completionRatio * 100)}%
              </p>
              <p className="mt-1 text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                {t("entryProgressHint", {
                  submitted: entry.submittedSheets + entry.lockedSheets,
                  expected: entry.expectedSheets,
                })}
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--ios-fill)]">
                <span
                  className="block h-full rounded-full bg-[var(--ios-success)] transition-[width] duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(entry.completionRatio * 100))}%`,
                  }}
                />
              </div>
              <ul className="mt-3 space-y-1.5 text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                <li className="flex justify-between gap-2">
                  <span>{t("entryProgress.draft")}</span>
                  <span className="tabular-nums font-medium text-[var(--ios-label)]">
                    {entry.draftSheets}
                  </span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>{t("entryProgress.submitted")}</span>
                  <span className="tabular-nums font-medium text-[var(--ios-label)]">
                    {entry.submittedSheets}
                  </span>
                </li>
              </ul>
            </div>
          ) : null}

          {sheets ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow)]">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-tertiary-label)]">
                {t("reportSheetsTitle", { term: sheets.termNumber })}
              </h2>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[var(--ios-fill)]">
                {(
                  [
                    [sheets.submitted, "bg-[var(--ios-warning)]"],
                    [sheets.visaSg, "bg-[var(--ios-blue)]"],
                    [sheets.visaPrincipal, "bg-[var(--ios-success)]"],
                    [sheets.rejected, "bg-[var(--ios-danger)]"],
                    [sheets.draft, "bg-[var(--ios-fill-tertiary)]"],
                  ] as const
                ).map(([value, color], i) =>
                  value > 0 ? (
                    <span
                      key={i}
                      className={color}
                      style={{
                        width: `${(value / Math.max(1, sheets.draft + sheets.submitted + sheets.visaSg + sheets.visaPrincipal + sheets.rejected)) * 100}%`,
                      }}
                    />
                  ) : null,
                )}
              </div>
              <ul className="mt-3 space-y-1.5 text-[var(--text-footnote)]">
                {(
                  [
                    ["submitted", sheets.submitted],
                    ["visaSg", sheets.visaSg],
                    ["visaPrincipal", sheets.visaPrincipal],
                    ["rejected", sheets.rejected],
                    ["draft", sheets.draft],
                  ] as const
                ).map(([key, value]) => (
                  <li key={key} className="flex justify-between gap-2 text-[var(--ios-secondary-label)]">
                    <span>{t(`reportSheetStatus.${key}`)}</span>
                    <span className="tabular-nums font-medium text-[var(--ios-label)]">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {enrollments ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow)]">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-tertiary-label)]">
                {t("enrollmentsTitle")}
              </h2>
              <p className="mt-3 text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-[var(--ios-label)]">
                {enrollments.totalEnrolled}
              </p>
              <p className="mt-1 text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                {t("enrollmentsHint")}
              </p>
              <ul className="mt-4 space-y-2.5">
                {enrollments.byCycle.map((row) => (
                  <li key={row.cycle}>
                    <div className="mb-1 flex justify-between gap-2 text-[var(--text-footnote)]">
                      <span className="text-[var(--ios-secondary-label)]">
                        {CYCLE_LABEL_KEYS.includes(row.cycle as (typeof CYCLE_LABEL_KEYS)[number])
                          ? t(`cycles.${row.cycle as (typeof CYCLE_LABEL_KEYS)[number]}`)
                          : row.cycle}
                      </span>
                      <span className="tabular-nums font-medium text-[var(--ios-label)]">
                        {row.enrolledCount}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ios-fill)]">
                      <span
                        className="block h-full rounded-full bg-[var(--ios-blue)]"
                        style={{ width: `${(row.enrolledCount / maxCycle) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {deadlines.length > 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow)] md:col-span-2 xl:col-span-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-tertiary-label)]">
                {t("deadlinesTitle")}
              </h2>
              <ul className="mt-3 space-y-2">
                {deadlines.slice(0, 5).map((session) => (
                  <li
                    key={session.id}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-[var(--ios-fill)]/55 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[var(--text-footnote)] font-medium text-[var(--ios-label)]">
                        {session.shortLabel ||
                          (session.name ? localized(session.name, locale) : `DEV${session.number}`)}
                      </p>
                      <p className="text-[10px] text-[var(--ios-secondary-label)]">
                        {session.entryDeadline ?? "—"}
                      </p>
                    </div>
                    <Badge tone={session.deadlineOverdue ? "danger" : "warning"}>
                      {session.deadlineOverdue
                        ? t("deadlineOverdue")
                        : t("deadlineSoon")}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-tertiary-label)]">
          {t("modulesSection")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map(({ href, key, icon: Icon }, index) => (
            <Link
              key={href}
              href={href}
              className="pressable group flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] px-4 py-3.5 shadow-[var(--ios-shadow)] transition-[border-color,box-shadow] hover:border-[var(--ios-separator)] hover:shadow-[var(--ios-shadow-md)] focus-visible:shadow-[var(--focus-ring)]"
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
                  MODULE_ACCENTS[index % MODULE_ACCENTS.length],
                )}
              >
                <Icon className="size-5 stroke-[1.75]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[var(--text-body)] font-medium text-[var(--ios-label)]">
                  {tNav(key)}
                </span>
                <span className="mt-0.5 block text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                  {t("moduleOpen")}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 stroke-[1.75] text-[var(--ios-tertiary-label)] transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
