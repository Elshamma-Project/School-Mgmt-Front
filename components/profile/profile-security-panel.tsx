"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Laptop,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Tablet,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailRow } from "@/components/ui/detail-row";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import {
  fetchSessions,
  logoutAll,
  revokeSession,
  type SessionDto,
  type SessionDeviceKind,
} from "@/lib/api/auth";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/types/api";
import type { AccountStatus } from "@/types/auth";

function formatInstant(value: string | null | undefined, locale: string): string | null {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Douala",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function shortUserAgent(ua: string | null | undefined): string | null {
  if (!ua?.trim()) return null;
  const raw = ua.trim();
  if (raw.length <= 72) return raw;
  return `${raw.slice(0, 69)}…`;
}

function deviceIcon(kind: string | undefined) {
  switch (kind) {
    case "MOBILE":
      return Smartphone;
    case "TABLET":
      return Tablet;
    case "DESKTOP":
      return Laptop;
    default:
      return MonitorSmartphone;
  }
}

type ProfileSecurityPanelProps = {
  lastLoginAt?: string | null;
  accountStatus?: AccountStatus | null;
};

/**
 * Sessions actives + résumé compte (UI profil).
 * Source : GET /api/v1/auth/sessions — jamais d’identifiant élève.
 */
export function ProfileSecurityPanel({
  lastLoginAt,
  accountStatus,
}: ProfileSecurityPanelProps) {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isMock = useAuthStore((s) => s.isMock);

  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSessions = useCallback(async () => {
    if (isMock) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchSessions();
      const sorted = [...list].sort((a, b) => {
        if (a.current === b.current) {
          return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
        }
        return a.current ? -1 : 1;
      });
      setSessions(sorted);
    } catch (error) {
      // Auth définitive déjà gérée par le client HTTP ; ici on évite un toast pour les cas vides.
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setSessions([]);
        return;
      }
      console.warn("[profile] sessions load failed", error);
      notify.error(t("sessionsLoadError"));
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [isMock, t]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const lastLoginLabel = useMemo(
    () => formatInstant(lastLoginAt, locale) ?? t("lastLoginUnknown"),
    [lastLoginAt, locale, t],
  );

  const statusTone =
    accountStatus === "ACTIVE"
      ? "success"
      : accountStatus === "PENDING"
        ? "warning"
        : accountStatus === "LOCKED" || accountStatus === "DISABLED"
          ? "danger"
          : "neutral";

  const statusLabel =
    accountStatus &&
    (["ACTIVE", "PENDING", "LOCKED", "DISABLED"] as const).includes(accountStatus)
      ? t(`accountStatus.${accountStatus}`)
      : accountStatus ?? "—";

  const otherCount = sessions.filter((s) => !s.current).length;

  async function onLogoutAll() {
    setBusy(true);
    try {
      if (isMock) {
        notify.success(t("logoutAllSuccess"), {
          description: t("logoutAllSuccessDetail", { count: 0 }),
        });
        return;
      }
      const result = await logoutAll();
      notify.success(t("logoutAllSuccess"), {
        description: t("logoutAllSuccessDetail", { count: result.revokedSessions }),
      });
      await loadSessions();
    } catch (error) {
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(tAuth("networkError"));
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(sessionId: string) {
    setBusy(true);
    try {
      await revokeSession(sessionId);
      notify.success(t("revokeSessionSuccess"));
      await loadSessions();
    } catch (error) {
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(tAuth("networkError"));
    } finally {
      setBusy(false);
      setConfirmRevokeId(null);
    }
  }

  return (
    <div className="space-y-3">
      <GroupedList header={t("securitySection")} footer={t("securitySessionsHint")}>
        <GroupedListItem>
          <DetailRow
            label={t("lastLogin")}
            value={lastLoginLabel}
            icon={<ShieldCheck className="size-4 stroke-[1.75]" />}
            stacked
          />
        </GroupedListItem>
        <GroupedListItem>
          <div className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                {t("accountStatusLabel")}
              </p>
              <div className="mt-1">
                <Badge tone={statusTone} className="gap-1.5 pl-1.5">
                  <span className="size-1.5 shrink-0 rounded-full bg-current opacity-90" aria-hidden />
                  {statusLabel}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                {t("activeSessions")}
              </p>
              <p className="mt-1 text-[var(--text-subhead)] font-semibold text-[var(--ios-label)]">
                {loading ? "…" : t("activeSessionsCount", { count: sessions.length })}
              </p>
            </div>
          </div>
        </GroupedListItem>
      </GroupedList>

      <div className="overflow-hidden rounded-[var(--radius-md)] bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
        {loading ? (
          <div className="space-y-3 px-4 py-4">
            <div className="h-16 animate-pulse rounded-[var(--radius-sm)] bg-[var(--ios-fill)]" />
            <div className="h-16 animate-pulse rounded-[var(--radius-sm)] bg-[var(--ios-fill)]" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-4 py-5 text-center text-[var(--text-subhead)] text-[var(--ios-secondary-label)]">
            {isMock ? t("mockHint") : t("sessionsEmpty")}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--ios-separator)]">
            {sessions.map((session) => {
              const kind = (session.deviceKind ?? "UNKNOWN") as SessionDeviceKind | "UNKNOWN";
              const Icon = deviceIcon(kind);
              const title =
                session.deviceLabel?.trim() ||
                shortUserAgent(session.userAgent) ||
                t("sessionUnknownDevice");
              const created = formatInstant(session.createdAt, locale);
              const lastSeen = formatInstant(session.lastSeenAt, locale);
              const expires = formatInstant(session.expiresAt, locale);

              return (
                <li
                  key={session.id}
                  className={cn(
                    "px-4 py-3.5",
                    session.current && "bg-[color-mix(in_srgb,var(--ios-blue)_6%,transparent)]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
                        session.current
                          ? "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]"
                          : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
                      )}
                      aria-hidden
                    >
                      <Icon className="size-4 stroke-[1.75]" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[var(--text-subhead)] font-semibold text-[var(--ios-label)]">
                          {title}
                        </p>
                        <Badge tone={session.current ? "blue" : "neutral"}>
                          {session.current ? t("sessionCurrent") : t("sessionOther")}
                        </Badge>
                        <Badge tone="neutral">
                          {t(`deviceKind.${kind}` as "deviceKind.MOBILE")}
                        </Badge>
                      </div>

                      <dl className="mt-2 grid grid-cols-1 gap-1.5 text-[var(--text-footnote)] text-[var(--ios-secondary-label)] sm:grid-cols-2">
                        <div>
                          <dt className="inline text-[var(--ios-tertiary-label)]">
                            {t("sessionIp")} ·{" "}
                          </dt>
                          <dd className="inline font-medium text-[var(--ios-label)]">
                            {session.ipAddress?.trim() || t("sessionUnknownIp")}
                          </dd>
                        </div>
                        {created ? (
                          <div>
                            <dt className="inline text-[var(--ios-tertiary-label)]">
                              {t("sessionCreated")} ·{" "}
                            </dt>
                            <dd className="inline font-medium text-[var(--ios-label)]">{created}</dd>
                          </div>
                        ) : null}
                        {lastSeen ? (
                          <div>
                            <dt className="inline text-[var(--ios-tertiary-label)]">
                              {t("sessionLastSeen")} ·{" "}
                            </dt>
                            <dd className="inline font-medium text-[var(--ios-label)]">{lastSeen}</dd>
                          </div>
                        ) : null}
                        {expires ? (
                          <div>
                            <dt className="inline text-[var(--ios-tertiary-label)]">
                              {t("sessionExpires")} ·{" "}
                            </dt>
                            <dd className="inline font-medium text-[var(--ios-label)]">{expires}</dd>
                          </div>
                        ) : null}
                      </dl>

                      {session.userAgent && session.deviceLabel ? (
                        <p className="mt-1.5 truncate text-[11px] text-[var(--ios-tertiary-label)]">
                          {t("sessionUa")} · {shortUserAgent(session.userAgent)}
                        </p>
                      ) : null}
                    </div>

                    {!session.current ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-[var(--ios-danger)] hover:bg-[color-mix(in_srgb,var(--ios-danger)_8%,transparent)]"
                        disabled={busy}
                        onClick={() => setConfirmRevokeId(session.id)}
                      >
                        {t("revokeSession")}
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!isMock && otherCount > 0 ? (
          <div className="border-t border-[var(--ios-separator)]">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-12 w-full justify-center gap-2.5 rounded-none font-medium text-[var(--ios-danger)] hover:bg-[color-mix(in_srgb,var(--ios-danger)_8%,transparent)]"
              loading={busy}
              leadingIcon={
                <LogOut className="size-4 stroke-[1.75] text-[var(--ios-danger)]" aria-hidden />
              }
              onClick={() => setConfirmLogoutAll(true)}
            >
              {t("logoutAllDevices")}
            </Button>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmLogoutAll}
        onOpenChange={setConfirmLogoutAll}
        title={t("logoutAllConfirmTitle")}
        description={t("logoutAllConfirmDescription")}
        confirmLabel={t("logoutAllDevices")}
        cancelLabel={tCommon("cancel")}
        tone="destructive"
        onConfirm={() => void onLogoutAll()}
      />

      <ConfirmDialog
        open={Boolean(confirmRevokeId)}
        onOpenChange={(open) => {
          if (!open) setConfirmRevokeId(null);
        }}
        title={t("revokeSessionConfirmTitle")}
        description={t("revokeSessionConfirmDescription")}
        confirmLabel={t("revokeSession")}
        cancelLabel={tCommon("cancel")}
        tone="destructive"
        onConfirm={() => {
          if (confirmRevokeId) void onRevoke(confirmRevokeId);
        }}
      />
    </div>
  );
}
