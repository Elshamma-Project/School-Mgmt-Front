"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Laptop,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Tablet,
  Wifi,
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
  type SessionDeviceKind,
} from "@/lib/api/auth";
import {
  isLocalNetworkIp,
  isPrivateNetworkIp,
  looksLikeUserAgent,
  parseUserAgent,
} from "@/lib/auth/session-display";
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
      <GroupedList header={t("securitySection")}>
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
              const parsed = parseUserAgent(session.userAgent);
              const customLabel = session.deviceLabel?.trim();
              const useCustomLabel = Boolean(customLabel && !looksLikeUserAgent(customLabel));
              const title = useCustomLabel
                ? customLabel!
                : parsed
                  ? t("sessionClientTitle", {
                      browser: t(`sessionBrowser.${parsed.browserId}`),
                      os: t(`sessionOs.${parsed.osId}`),
                    })
                  : t("sessionUnknownDevice");
              const created = formatInstant(session.createdAt, locale);
              const lastSeen = formatInstant(session.lastSeenAt, locale);
              const networkLabel = isLocalNetworkIp(session.ipAddress)
                ? t("sessionLocalNetwork")
                : isPrivateNetworkIp(session.ipAddress)
                  ? t("sessionPrivateNetwork")
                  : session.ipAddress?.trim()
                    ? session.ipAddress.trim()
                    : t("sessionUnknownIp");

              return (
                <li
                  key={session.id}
                  className={cn(
                    "px-4 py-4",
                    session.current && "bg-[color-mix(in_srgb,var(--ios-blue)_5%,transparent)]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        session.current
                          ? "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]"
                          : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
                      )}
                      aria-hidden
                    >
                      <Icon className="size-4 stroke-[1.75]" />
                    </span>

                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                            {title}
                          </p>
                          <p className="mt-0.5 text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                            {t(`deviceKind.${kind}` as "deviceKind.MOBILE")}
                          </p>
                        </div>

                        {session.current ? (
                          <Badge tone="blue" className="shrink-0">
                            {t("sessionCurrent")}
                          </Badge>
                        ) : (
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
                        )}
                      </div>

                      <ul className="space-y-1.5 text-[12px] leading-snug text-[var(--ios-secondary-label)]">
                        {created ? (
                          <li className="flex items-start gap-2">
                            <Clock3
                              className="mt-0.5 size-3.5 shrink-0 stroke-[1.75] text-[var(--ios-tertiary-label)]"
                              aria-hidden
                            />
                            <span>
                              <span className="text-[var(--ios-tertiary-label)]">
                                {t("sessionCreated")} ·{" "}
                              </span>
                              <span className="font-medium text-[var(--ios-label)]">{created}</span>
                            </span>
                          </li>
                        ) : null}
                        {lastSeen ? (
                          <li className="flex items-start gap-2">
                            <Clock3
                              className="mt-0.5 size-3.5 shrink-0 stroke-[1.75] text-[var(--ios-tertiary-label)]"
                              aria-hidden
                            />
                            <span>
                              <span className="text-[var(--ios-tertiary-label)]">
                                {t("sessionLastSeen")} ·{" "}
                              </span>
                              <span className="font-medium text-[var(--ios-label)]">{lastSeen}</span>
                            </span>
                          </li>
                        ) : null}
                        <li className="flex items-start gap-2">
                          <Wifi
                            className="mt-0.5 size-3.5 shrink-0 stroke-[1.75] text-[var(--ios-tertiary-label)]"
                            aria-hidden
                          />
                          <span>
                            <span className="text-[var(--ios-tertiary-label)]">
                              {t("sessionIp")} ·{" "}
                            </span>
                            <span className="font-medium text-[var(--ios-label)]">{networkLabel}</span>
                          </span>
                        </li>
                      </ul>
                    </div>
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
