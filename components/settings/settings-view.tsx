"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { PageHeader } from "@/components/ui/page-header";
import { createMockLogin, listMockRoles } from "@/lib/auth/mock-users";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole, type AppRole } from "@/types/auth";

export function SettingsView() {
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tRoles = useTranslations("roles");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isMock = useAuthStore((s) => s.isMock);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const currentRole = primaryRole(user);
  const [confirmLogout, setConfirmLogout] = useState(false);

  function performLogout() {
    clearSession();
    router.replace("/login");
  }

  function switchRole(role: AppRole) {
    const response = createMockLogin(role);
    setSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
      mustChangePassword: false,
      isMock: true,
    });
    router.replace(getRoleHomePath(role));
  }

  return (
    <div className="space-y-6 slide-up">
      <PageHeader description={t("description")} />

      <GroupedList header={t("languageSection")}>
        <GroupedListItem>
          <span className="text-[var(--text-body)] text-[var(--ios-label)]">
            {tCommon("language")}
          </span>
          <LocaleSwitcher />
        </GroupedListItem>
      </GroupedList>

      <GroupedList header={t("sessionSection")}>
        <GroupedListItem>
          <div className="min-w-0">
            <p className="truncate text-[var(--text-body)] text-[var(--ios-label)]">
              {user?.displayName ?? user?.username ?? "—"}
            </p>
            {currentRole ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge tone="blue">{tRoles(`${currentRole}.label`)}</Badge>
                {isMock ? <Badge tone="neutral">{tCommon("demoBadge")}</Badge> : null}
              </div>
            ) : null}
          </div>
          <Button variant="destructive" size="sm" onClick={() => setConfirmLogout(true)}>
            {tAuth("logout")}
          </Button>
        </GroupedListItem>
      </GroupedList>

      {isMock ? (
        <GroupedList header={t("switchRoleSection")} footer={t("switchRoleFooter")}>
          {listMockRoles().map((role) => {
            const active = role === currentRole;
            return (
              <GroupedListItem key={role} className="p-0">
                <button
                  type="button"
                  onClick={() => switchRole(role)}
                  className={cn(
                    "pressable flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left focus-visible:shadow-[var(--focus-ring)]",
                    active && "bg-[var(--ios-blue)]/10",
                  )}
                >
                  <span>
                    <span className="block text-[var(--text-body)] text-[var(--ios-label)]">
                      {tRoles(`${role}.label`)}
                    </span>
                    <span className="text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                      {tRoles(`${role}.hint`)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                      active
                        ? "border-[var(--ios-blue)] bg-[var(--ios-blue)] text-white"
                        : "border-[var(--ios-fill-secondary)] bg-transparent text-transparent",
                    )}
                    aria-hidden
                  >
                    <Check className="size-3.5 stroke-[2.5]" />
                  </span>
                </button>
              </GroupedListItem>
            );
          })}
        </GroupedList>
      ) : null}

      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title={tAuth("logoutConfirmTitle")}
        description={tAuth("logoutConfirmDescription")}
        confirmLabel={tAuth("logout")}
        cancelLabel={tCommon("cancel")}
        tone="destructive"
        onConfirm={performLogout}
      />
    </div>
  );
}
