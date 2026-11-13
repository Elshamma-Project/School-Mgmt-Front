"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CheckCheck,
  CircleAlert,
  FileWarning,
  Inbox,
  Send,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import {
  acknowledgeNotification,
  acknowledgeStaffSignal,
  closeStaffSignal,
  createStaffSignal,
  listAdminStaffSignals,
  listMyStaffSignals,
  listNotifications,
  markNotificationRead,
  type InAppNotificationResponse,
  type StaffSignalCategory,
  type StaffSignalResponse,
  type StaffSignalStatus,
} from "@/lib/api/notifications";
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

function severityTone(
  severity: InAppNotificationResponse["severity"],
): "neutral" | "blue" | "success" | "warning" | "danger" {
  if (severity === "URGENT") return "danger";
  if (severity === "WARNING") return "warning";
  if (severity === "SUCCESS") return "success";
  return "blue";
}

function canSubmitSignals(role: AppRole | null): boolean {
  return role === "TEACHER" || role === "SUPER_ADMIN";
}

function canManageSignals(role: AppRole | null): boolean {
  return role === "ADMINISTRATION" || role === "DIRECTOR" || role === "SUPER_ADMIN";
}

export function NotificationsView() {
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId;
  const role = primaryRole(user);

  const initialTab: Tab =
    searchParams.get("tab") === "signals" ? "signals" : "inbox";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InAppNotificationResponse[]>([]);
  const [signals, setSignals] = useState<StaffSignalResponse[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "ack">("all");

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

  const filteredInbox = useMemo(() => {
    if (filter === "unread") return rows.filter((r) => r.unread);
    if (filter === "ack") return rows.filter((r) => r.pendingAck);
    return rows;
  }, [filter, rows]);

  const pendingAckCount = rows.filter((r) => r.pendingAck).length;
  const unreadCount = rows.filter((r) => r.unread).length;

  const onRead = async (row: InAppNotificationResponse) => {
    if (!row.unread) return;
    setActing(`read:${row.id}`);
    try {
      const updated = await markNotificationRead(row.id, schoolId);
      setRows((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
    } finally {
      setActing(null);
    }
  };

  const onAck = async (row: InAppNotificationResponse) => {
    setActing(`ack:${row.id}`);
    try {
      const updated = await acknowledgeNotification(row.id, schoolId);
      setRows((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
      notify.success(t("ackSuccess"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
    } finally {
      setActing(null);
    }
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
      setTab("signals");
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

  return (
    <div className="space-y-5 slide-up">
      <PageHeader description={t("description")} />

      <Alert tone="info" title={t("professionalTitle")} description={t("professionalHint")} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<Tab>
          ariaLabel={t("tabsAria")}
          value={tab}
          onChange={setTab}
          options={
            teacherMode || adminMode
              ? [
                  { value: "inbox", label: t("tabs.inbox") },
                  { value: "signals", label: t("tabs.signals") },
                ]
              : [{ value: "inbox", label: t("tabs.inbox") }]
          }
        />
        {tab === "inbox" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="blue">{t("stats.unread", { count: unreadCount })}</Badge>
            {pendingAckCount > 0 ? (
              <Badge tone="warning">{t("stats.pendingAck", { count: pendingAckCount })}</Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      {tab === "inbox" ? (
        <div className="space-y-4">
          <SegmentedControl<"all" | "unread" | "ack">
            ariaLabel={t("filterAria")}
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: t("filter.all") },
              { value: "unread", label: t("filter.unread") },
              { value: "ack", label: t("filter.ack") },
            ]}
          />

          {loading ? (
            <p className="text-[13px] text-[var(--ios-secondary-label)]">{tCommon("loading")}</p>
          ) : filteredInbox.length === 0 ? (
            <EmptyState
              title={t("empty")}
              description={t("emptyHint")}
              icon={<Inbox className="size-9 stroke-[1.5]" aria-hidden />}
            />
          ) : (
            <ul className="space-y-2.5">
              {filteredInbox.map((row) => (
                <li
                  key={row.id}
                  className={cn(
                    "rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow)]",
                    row.unread && "border-l-[3px] border-l-[var(--ios-blue)]",
                    row.pendingAck && "border-l-[3px] border-l-[var(--ios-warning)]",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={severityTone(row.severity)}>
                          {t(`category.${row.category}`)}
                        </Badge>
                        {row.unread ? <Badge tone="blue">{t("badge.unread")}</Badge> : null}
                        {row.pendingAck ? (
                          <Badge tone="warning">{t("badge.pendingAck")}</Badge>
                        ) : null}
                        {row.ackedAt ? (
                          <Badge tone="success">{t("badge.acked")}</Badge>
                        ) : null}
                      </div>
                      <p className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                        {localized(row.title, locale)}
                      </p>
                      <p className="text-[13px] leading-relaxed text-[var(--ios-secondary-label)]">
                        {localized(row.body, locale)}
                      </p>
                      <p className="text-[11px] text-[var(--ios-tertiary-label)]">
                        {formatWhen(row.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {row.unread ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          loading={acting === `read:${row.id}`}
                          leadingIcon={<CheckCheck className="size-3.5" aria-hidden />}
                          onClick={() => void onRead(row)}
                        >
                          {t("markRead")}
                        </Button>
                      ) : null}
                      {row.pendingAck ? (
                        <Button
                          type="button"
                          size="sm"
                          loading={acting === `ack:${row.id}`}
                          leadingIcon={<BadgeCheck className="size-3.5" aria-hidden />}
                          onClick={() => void onAck(row)}
                        >
                          {t("acknowledge")}
                        </Button>
                      ) : null}
                      {row.deepLink ? (
                        <Link
                          href={row.deepLink as `/${string}`}
                          className="pressable inline-flex h-[var(--control-height-sm)] items-center rounded-[var(--radius-md)] px-3 text-[11px] font-semibold text-[var(--ios-blue)] hover:bg-[var(--ios-fill)]"
                        >
                          {t("open")}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {teacherMode ? (
            <div className="space-y-3.5 rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow)]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]">
                  <Send className="size-[18px] stroke-[1.75]" aria-hidden />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--ios-label)]">
                    {t("signal.formTitle")}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-[var(--ios-secondary-label)]">
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

          {loading ? (
            <p className="text-[13px] text-[var(--ios-secondary-label)]">{tCommon("loading")}</p>
          ) : signals.length === 0 ? (
            <EmptyState
              title={t("signal.emptyTitle")}
              description={t("signal.emptyHint")}
              icon={<FileWarning className="size-9 stroke-[1.5]" aria-hidden />}
            />
          ) : (
            <ul className="space-y-2.5">
              {signals.map((row) => (
                <li
                  key={row.id}
                  className="space-y-2.5 rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow)]"
                >
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
                  <p className="text-[14px] font-semibold text-[var(--ios-label)]">{row.subject}</p>
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
                    <p className="rounded-[var(--radius-sm)] bg-[var(--ios-fill)]/70 px-3 py-2 text-[12px] text-[var(--ios-label)]">
                      {t("signal.adminNote")}: {row.adminNote}
                    </p>
                  ) : null}
                  {adminMode && row.status !== "CLOSED" ? (
                    <div className="flex flex-wrap gap-1.5">
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
        </div>
      )}
    </div>
  );
}
