"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Button } from "@/components/ui/button";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { PageHeader } from "@/components/ui/page-header";
import { createMockLogin, listMockRoles } from "@/lib/auth/mock-users";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole, type AppRole } from "@/types/auth";

export default function SettingsPage() {
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

  function handleLogout() {
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
    router.replace("/");
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />

      <GroupedList header={t("languageSection")}>
        <GroupedListItem>
          <span className="text-[17px] text-[var(--ios-label)]">{tCommon("language")}</span>
          <LocaleSwitcher />
        </GroupedListItem>
      </GroupedList>

      <GroupedList header={t("sessionSection")}>
        <GroupedListItem>
          <div className="min-w-0">
            <p className="truncate text-[17px] text-[var(--ios-label)]">
              {user?.displayName ?? user?.username ?? "—"}
            </p>
            {currentRole ? (
              <p className="text-[13px] text-[var(--ios-secondary-label)]">
                {tRoles(`${currentRole}.label`)}
                {isMock ? ` · ${tCommon("demoBadge")}` : null}
              </p>
            ) : null}
          </div>
          <Button variant="destructive" size="sm" onClick={handleLogout}>
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
                    "flex min-h-11 w-full items-center justify-between px-4 py-2.5 text-left",
                    active && "bg-[var(--ios-blue)]/5",
                  )}
                >
                  <span>
                    <span className="block text-[17px] text-[var(--ios-label)]">
                      {tRoles(`${role}.label`)}
                    </span>
                    <span className="text-[13px] text-[var(--ios-secondary-label)]">
                      {tRoles(`${role}.hint`)}
                    </span>
                  </span>
                  {active ? (
                    <span className="text-[13px] font-semibold text-[var(--ios-blue)]">
                      {t("activeRole")}
                    </span>
                  ) : null}
                </button>
              </GroupedListItem>
            );
          })}
        </GroupedList>
      ) : null}
    </div>
  );
}
