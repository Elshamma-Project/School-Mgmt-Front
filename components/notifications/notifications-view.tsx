"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  EyeOff,
  FileWarning,
  Inbox,
  Lock,
  Megaphone,
  Send,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  acknowledgeStaffSignal,
  closeStaffSignal,
  createStaffSignal,
  listAdminStaffSignals,
  listMyStaffSignals,
  listNotifications,
  markNotificationRead,
  markNotificationUnread,
  type InAppNotificationResponse,
  type NotificationCategory,
  type StaffSignalCategory,
  type StaffSignalResponse,
  type StaffSignalStatus,
} from "@/lib/api/notifications";
import { resolveNotificationDeepLink } from "@/lib/notifications/deep-link";
import { bumpUnreadNotificationCount } from "@/lib/notifications/use-unread-count";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole, type AppRole } from "@/types/auth";

type Tab = "inbox" | "signals";

const SIGNAL_CATEGORIES: StaffSignalCategory[] = [
  "DATA_ERROR",
  "GRADE_ISSUE",
  "MISSING_INFO",
  "ACCESS_ISSUE",
  "OTHER",
];

function localized(
  text: { fr: string | null; en: string | null },
  locale: string,
): string {
  if (locale.startsWith("en")) return text.en || text.fr || "—";
  return text.fr || text.en || "—";
}

function canSubmitSignals(role: AppRole | null): boolean {
  return role === "TEACHER" || role === "SUPER_ADMIN";
}

function canManageSignals(role: AppRole | null): boolean {
  return role === "ADMINISTRATION" || role === "DIRECTOR" || role === "SUPER_ADMIN";
}

type CategoryStyle = {
  chip: string;
  iconWrap: string;
  Icon: typeof Lock;
};

function categoryStyle(category: NotificationCategory): CategoryStyle {
  if (category === "SESSION_CLOSED") {
    return {
      chip: "bg-[color-mix(in_srgb,var(--ios-danger)_12%,var(--ios-card))] text-[var(--ios-danger)]",
      iconWrap: "bg-[color-mix(in_srgb,var(--ios-danger)_12%,var(--ios-card))] text-[var(--ios-danger)]",
      Icon: Lock,
    };
  }
  if (category === "CORRECTION_REQUESTED" || category === "STAFF_SIGNAL") {
    return {
      chip: "bg-[color-mix(in_srgb,var(--ios-warning)_14%,var(--ios-card))] text-[color-mix(in_srgb,var(--ios-warning)_85%,#000)]",
      iconWrap: "bg-[color-mix(in_srgb,var(--ios-warning)_14%,var(--ios-card))] text-[var(--ios-warning)]",
      Icon: category === "STAFF_SIGNAL" ? Megaphone : CircleAlert,
    };
  }
  if (category === "CORRECTION_DECIDED") {
    return {
      chip: "bg-[color-mix(in_srgb,var(--ios-success)_14%,var(--ios-card))] text-[var(--ios-success)]",
      iconWrap: "bg-[color-mix(in_srgb,var(--ios-success)_14%,var(--ios-card))] text-[var(--ios-success)]",
      Icon: CheckCircle2,
    };
  }
  if (category === "REPORT_SHEET_REJECTED") {
    return {
      chip: "bg-[color-mix(in_srgb,var(--ios-danger)_12%,var(--ios-card))] text-[var(--ios-danger)]",
      iconWrap: "bg-[color-mix(in_srgb,var(--ios-danger)_12%,var(--ios-card))] text-[var(--ios-danger)]",
      Icon: FileWarning,
    };
  }
  return {
    chip: "bg-[color-mix(in_srgb,var(--ios-blue)_10%,var(--ios-card))] text-[var(--ios-blue)]",
    iconWrap: "bg-[color-mix(in_srgb,var(--ios-blue)_10%,var(--ios-card))] text-[var(--ios-blue)]",
    Icon: Inbox,
  };
}

export function NotificationsView() {
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId;
  const role = primaryRole(user);

  const tabFromUrl: Tab = searchParams.get("tab") === "signals" ? "signals" : "inbox";
  const [tab, setTab] = useState<Tab>(tabFromUrl);

  // Synchronise l’onglet avec `?tab=` (deepLink signalements, cloche, etc.).
  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  const selectTab = useCallback(
    (next: Tab) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "signals") params.set("tab", "signals");
      else params.delete("tab");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InAppNotificationResponse[]>([]);
  const [signals, setSignals] = useState<StaffSignalResponse[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  /** Messages ouverts dans la session (corps visible). */
  const [openedIds, setOpenedIds] = useState<Record<string, true>>({});

  const [signalCategory, setSignalCategory] = useState<StaffSignalCategory>("OTHER");
  const [signalSubject, setSignalSubject] = useState("");
  const [signalMessage, setSignalMessage] = useState("");
  const [signalInvalid, setSignalInvalid] = useState(false);
  const [submittingSignal, setSubmittingSignal] = useState(false);
  const [adminStatusFilter, setAdminStatusFilter] = useState<StaffSignalStatus | "ALL">(
    "OPEN",
  );

  const teacherMode = canSubmitSignals(role);
  const adminMode = canManageSignals(role);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listNotifications({ schoolId }));
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("loadError"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  const loadSignals = useCallback(async () => {
    setLoading(true);
    try {
      if (adminMode) {
        setSignals(
          await listAdminStaffSignals({
            status: adminStatusFilter === "ALL" ? null : adminStatusFilter,
            schoolId,
          }),
        );
      } else if (teacherMode) {
        setSignals(await listMyStaffSignals(schoolId));
      } else {
        setSignals([]);
      }
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("loadError"));
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, [adminMode, adminStatusFilter, schoolId, t, teacherMode]);

  useEffect(() => {
    if (tab === "inbox") void loadInbox();
    else void loadSignals();
  }, [loadInbox, loadSignals, tab]);

  const openFromQuery = searchParams.get("open")?.trim() || null;

  const onOpenMessage = useCallback(
    async (row: InAppNotificationResponse) => {
      setOpenedIds((prev) => ({ ...prev, [row.id]: true }));
      if (!row.unread && !row.pendingAck) return;
      setActing(`open:${row.id}`);
      try {
        const updated = await markNotificationRead(row.id, schoolId);
        setRows((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
        bumpUnreadNotificationCount();
      } catch (error) {
        if (isAuthFailure(error)) return;
        notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
      } finally {
        setActing(null);
      }
    },
    [schoolId, t],
  );

  /** Arrivée depuis le menu cloche : `?open=<id>` → ouvrir la notif (boîte). */
  useEffect(() => {
    if (!openFromQuery || rows.length === 0) return;
    if (tab !== "inbox") {
      selectTab("inbox");
      return;
    }
    const target = rows.find((row) => row.id === openFromQuery);
    if (!target) return;
    void onOpenMessage(target);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("open");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [onOpenMessage, openFromQuery, pathname, router, rows, searchParams, selectTab, tab]);

  const filteredInbox = useMemo(() => {
    if (filter === "unread") return rows.filter((r) => r.unread);
    return rows;
  }, [filter, rows]);

  const unreadCount = rows.filter((r) => r.unread).length;

  const onMarkUnread = async (row: InAppNotificationResponse) => {
    setActing(`unread:${row.id}`);
    try {
      const updated = await markNotificationUnread(row.id, schoolId);
      setRows((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
      setOpenedIds((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      bumpUnreadNotificationCount();
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
    } finally {
      setActing(null);
    }
  };

  const onFollowDeepLink = async (row: InAppNotificationResponse) => {
    const target = resolveNotificationDeepLink(row.deepLink, role);
    if (!target) return;

    // Assurer lecture + accusé avant de quitter la boîte.
    if (row.unread || row.pendingAck) {
      try {
        const updated = await markNotificationRead(row.id, schoolId);
        setRows((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
        bumpUnreadNotificationCount();
      } catch (error) {
        if (isAuthFailure(error)) return;
        notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
        return;
      }
    }

    // DeepLink interne à cette page (signalements) : bascule d’onglet sans recharger.
    if (target.pathname === "/notifications") {
      if (target.query.tab === "signals") selectTab("signals");
      else selectTab("inbox");
      return;
    }

    router.push(target.href as `/${string}`);
  };

  const onSubmitSignal = async () => {
    const subject = signalSubject.trim();
    const message = signalMessage.trim();
    if (subject.length < 5 || message.length < 15) {
      setSignalInvalid(true);
      notify.error(t("signal.validation"));
      return;
    }
    setSubmittingSignal(true);
    try {
      await createStaffSignal({
        category: signalCategory,
        subject,
        message,
        schoolId,
      });
      notify.success(t("signal.success"));
      setSignalSubject("");
      setSignalMessage("");
      setSignalInvalid(false);
      selectTab("signals");
      await loadSignals();
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("signal.error"));
    } finally {
      setSubmittingSignal(false);
    }
  };

  const onAckSignal = async (row: StaffSignalResponse) => {
    setActing(`sig-ack:${row.id}`);
    try {
      const updated = await acknowledgeStaffSignal(row.id, undefined, schoolId);
      setSignals((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
      notify.success(t("signal.ackSuccess"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
    } finally {
      setActing(null);
    }
  };

  const onCloseSignal = async (row: StaffSignalResponse) => {
    setActing(`sig-close:${row.id}`);
    try {
      const updated = await closeStaffSignal(row.id, undefined, schoolId);
      setSignals((prev) =>
        adminStatusFilter === "OPEN"
          ? prev.filter((item) => item.id !== row.id)
          : prev.map((item) => (item.id === row.id ? updated : item)),
      );
      notify.success(t("signal.closeSuccess"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
    } finally {
      setActing(null);
    }
  };

  const formatWhen = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatWhenShort = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const now = new Date();
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (sameDay) {
      return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="space-y-4 slide-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl<Tab>
            ariaLabel={t("tabsAria")}
            value={tab}
            onChange={selectTab}
            options={
              teacherMode || adminMode
                ? [
                    { value: "inbox", label: t("tabs.inbox") },
                    { value: "signals", label: t("tabs.signals") },
                  ]
                : [{ value: "inbox", label: t("tabs.inbox") }]
            }
          />
          {tab === "inbox" && unreadCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--ios-blue)_12%,var(--ios-card))] px-2.5 py-1 text-[11px] font-semibold text-[var(--ios-blue)]">
              <span className="size-1.5 rounded-full bg-[var(--ios-blue)]" aria-hidden />
              {t("stats.unread", { count: unreadCount })}
            </span>
          ) : null}
        </div>
        {tab === "inbox" ? (
          <SegmentedControl<"all" | "unread">
            ariaLabel={t("filterAria")}
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("filter.all") },
              { value: "unread", label: t("filter.unread") },
            ]}
          />
        ) : null}
      </div>

      {tab === "inbox" ? (
        <section
          className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/40 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]"
          aria-label={t("tabs.inbox")}
        >
          {loading ? (
            <div className="space-y-0 divide-y divide-[var(--ios-separator)]/35">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 px-4 py-3.5">
                  <div className="size-9 shrink-0 animate-pulse rounded-full bg-[var(--ios-fill)]" />
                  <div className="min-w-0 flex-1 space-y-2 py-0.5">
                    <div className="h-3 w-24 animate-pulse rounded bg-[var(--ios-fill)]" />
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-[var(--ios-fill)]" />
                    <div className="h-3 w-full animate-pulse rounded bg-[var(--ios-fill)]/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredInbox.length === 0 ? (
            <div className="px-4 py-10">
              <EmptyState
                title={t("empty")}
                description={t("emptyHint")}
                icon={<Inbox className="size-9 stroke-[1.5]" aria-hidden />}
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--ios-separator)]/35">
              {filteredInbox.map((row) => {
                const isOpen =
                  Boolean(openedIds[row.id]) || (!row.unread && !row.pendingAck);
                const style = categoryStyle(row.category);
                const Icon = style.Icon;
                return (
                  <li
                    key={row.id}
                    className={cn(
                      "transition-colors",
                      row.unread
                        ? "bg-[color-mix(in_srgb,var(--ios-blue)_4.5%,var(--ios-card))]"
                        : "bg-[var(--ios-card)]",
                      isOpen && "bg-[color-mix(in_srgb,var(--ios-blue)_7%,var(--ios-card))]",
                    )}
                  >
                    <button
                      type="button"
                      className="pressable group flex w-full gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--ios-blue)]"
                      aria-expanded={isOpen}
                      onClick={() => void onOpenMessage(row)}
                    >
                      <span className="relative mt-0.5 shrink-0">
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-full",
                            style.iconWrap,
                          )}
                          aria-hidden
                        >
                          <Icon className="size-4 stroke-[1.75]" />
                        </span>
                        {row.unread ? (
                          <span
                            className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[var(--ios-blue)] ring-2 ring-[var(--ios-card)]"
                            aria-hidden
                          />
                        ) : null}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0 space-y-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={cn(
                                  "inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.03em]",
                                  style.chip,
                                )}
                              >
                                {t(`category.${row.category}`)}
                              </span>
                              {row.ackedAt ? (
                                <span className="text-[10px] font-medium text-[var(--ios-success)]">
                                  {t("badge.acked")}
                                </span>
                              ) : null}
                            </span>
                            <span
                              className={cn(
                                "block truncate text-[14px] tracking-[-0.01em] text-[var(--ios-label)]",
                                row.unread ? "font-bold" : "font-semibold",
                              )}
                            >
                              {localized(row.title, locale)}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1 pt-0.5">
                            <span
                              className={cn(
                                "text-[11px] tabular-nums",
                                row.unread
                                  ? "font-semibold text-[var(--ios-blue)]"
                                  : "text-[var(--ios-tertiary-label)]",
                              )}
                            >
                              {formatWhenShort(row.createdAt)}
                            </span>
                            <ChevronRight
                              className={cn(
                                "size-3.5 stroke-[1.75] text-[var(--ios-tertiary-label)] transition-transform",
                                isOpen && "rotate-90 text-[var(--ios-blue)]",
                              )}
                              aria-hidden
                            />
                          </span>
                        </span>

                        {!isOpen ? (
                          <span className="mt-1 line-clamp-2 overflow-hidden break-words text-[12px] leading-snug text-[var(--ios-secondary-label)]">
                            {localized(row.body, locale)}
                          </span>
                        ) : null}
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="space-y-3 border-t border-[var(--ios-separator)]/30 bg-[color-mix(in_srgb,var(--ios-fill)_28%,var(--ios-card))] px-4 py-3.5 pl-[3.75rem]">
                        <p className="text-[13px] leading-relaxed text-[var(--ios-label)]/85">
                          {localized(row.body, locale)}
                        </p>
                        <p className="text-[11px] tabular-nums text-[var(--ios-tertiary-label)]">
                          {formatWhen(row.createdAt)}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {!row.unread ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              loading={acting === `unread:${row.id}`}
                              leadingIcon={<EyeOff className="size-3.5" aria-hidden />}
                              onClick={() => void onMarkUnread(row)}
                            >
                              {t("markUnread")}
                            </Button>
                          ) : null}
                          {resolveNotificationDeepLink(row.deepLink, role) ? (
                            <Button
                              type="button"
                              size="sm"
                              leadingIcon={<ChevronRight className="size-3.5" aria-hidden />}
                              onClick={() => void onFollowDeepLink(row)}
                            >
                              {t("open")}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <div className="space-y-4">
          {teacherMode ? (
            <div className="space-y-3.5 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/40 bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow)]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ios-blue)_10%,var(--ios-card))] text-[var(--ios-blue)]">
                  <Send className="size-[18px] stroke-[1.75]" aria-hidden />
                </span>
                <div>
                  <p className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                    {t("signal.formTitle")}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-[var(--ios-secondary-label)]">
                    {t("signal.formHint")}
                  </p>
                </div>
              </div>
              <Field label={t("signal.category")}>
                <select
                  className="h-10 w-full rounded-[var(--radius-md)] border border-transparent bg-[var(--ios-fill)] px-3 text-[13px] text-[var(--ios-label)]"
                  value={signalCategory}
                  onChange={(e) => setSignalCategory(e.target.value as StaffSignalCategory)}
                >
                  {SIGNAL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {t(`signal.categories.${cat}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("signal.subject")}>
                <Input
                  value={signalSubject}
                  invalid={signalInvalid && signalSubject.trim().length < 5}
                  placeholder={t("signal.subjectPlaceholder")}
                  onChange={(e) => {
                    setSignalSubject(e.target.value);
                    setSignalInvalid(false);
                  }}
                />
              </Field>
              <Field label={t("signal.message")}>
                <Textarea
                  rows={4}
                  value={signalMessage}
                  invalid={signalInvalid && signalMessage.trim().length < 15}
                  placeholder={t("signal.messagePlaceholder")}
                  onChange={(e) => {
                    setSignalMessage(e.target.value);
                    setSignalInvalid(false);
                  }}
                />
              </Field>
              <div className="flex justify-end">
                <Button
                  type="button"
                  loading={submittingSignal}
                  leadingIcon={<CircleAlert className="size-3.5" aria-hidden />}
                  onClick={() => void onSubmitSignal()}
                >
                  {t("signal.submit")}
                </Button>
              </div>
            </div>
          ) : null}

          {adminMode ? (
            <SegmentedControl<StaffSignalStatus | "ALL">
              ariaLabel={t("signal.statusFilter")}
              value={adminStatusFilter}
              onChange={setAdminStatusFilter}
              options={[
                { value: "OPEN", label: t("signal.status.OPEN") },
                { value: "ACKNOWLEDGED", label: t("signal.status.ACKNOWLEDGED") },
                { value: "CLOSED", label: t("signal.status.CLOSED") },
                { value: "ALL", label: t("signal.status.ALL") },
              ]}
            />
          ) : null}

          <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/40 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
            {loading ? (
              <p className="px-4 py-8 text-[13px] text-[var(--ios-secondary-label)]">
                {tCommon("loading")}
              </p>
            ) : signals.length === 0 ? (
              <div className="px-4 py-10">
                <EmptyState
                  title={t("signal.emptyTitle")}
                  description={t("signal.emptyHint")}
                  icon={<FileWarning className="size-9 stroke-[1.5]" aria-hidden />}
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--ios-separator)]/35">
                {signals.map((row) => (
                  <li key={row.id} className="space-y-2.5 px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          row.status === "CLOSED"
                            ? "success"
                            : row.status === "ACKNOWLEDGED"
                              ? "blue"
                              : "warning"
                        }
                      >
                        {t(`signal.status.${row.status}`)}
                      </Badge>
                      <Badge tone="neutral">{t(`signal.categories.${row.category}`)}</Badge>
                    </div>
                    <p className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                      {row.subject}
                    </p>
                    <p className="text-[13px] leading-relaxed text-[var(--ios-secondary-label)]">
                      {row.message}
                    </p>
                    <p className="text-[11px] text-[var(--ios-tertiary-label)]">
                      {adminMode ? `${row.authorLabel} · ` : null}
                      {formatWhen(row.createdAt)}
                      {row.relatedSessionNumber != null
                        ? ` · ${t("signal.relatedSequence", { number: row.relatedSessionNumber })}`
                        : null}
                    </p>
                    {row.adminNote ? (
                      <p className="rounded-[var(--radius-md)] bg-[var(--ios-fill)]/70 px-3 py-2 text-[12px] text-[var(--ios-label)]">
                        {t("signal.adminNote")}: {row.adminNote}
                      </p>
                    ) : null}
                    {adminMode && row.status !== "CLOSED" ? (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {row.status === "OPEN" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            loading={acting === `sig-ack:${row.id}`}
                            onClick={() => void onAckSignal(row)}
                          >
                            {t("signal.acknowledge")}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          loading={acting === `sig-close:${row.id}`}
                          onClick={() => void onCloseSignal(row)}
                        >
                          {t("signal.close")}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
