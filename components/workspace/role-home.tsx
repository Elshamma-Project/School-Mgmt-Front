"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { PageHeader } from "@/components/ui/page-header";
import { Link } from "@/i18n/navigation";
import { getNavItemsForRole } from "@/lib/auth/nav-config";
import { listCapabilities } from "@/lib/auth/permissions";
import { isComingSoonRole } from "@/lib/auth/mock-users";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

export function RoleHome() {
  const t = useTranslations("home");
  const tNav = useTranslations("nav");
  const tRoles = useTranslations("roles");
  const tCommon = useTranslations("common");
  const tCaps = useTranslations("capabilities");
  const user = useAuthStore((s) => s.user);
  const isMock = useAuthStore((s) => s.isMock);
  const role = primaryRole(user);
  const modules = getNavItemsForRole(role).filter(
    (item) => item.key !== "home" && item.key !== "settings" && item.key !== "notifications",
  );

  if (!role) return null;

  const greetingName = user?.displayName ?? user?.username ?? "";
  const caps = listCapabilities(role).slice(0, 4);

  return (
    <div className="space-y-6 slide-up">
      <div>
        <p className="text-[var(--text-title2)] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
          {t("greeting", { name: greetingName })}
        </p>
        <PageHeader
          description={tRoles(`${role}.homeBlurb`)}
          className="mt-1 max-w-2xl text-[var(--text-subhead)] leading-relaxed text-[var(--ios-secondary-label)]"
        />
      </div>

      {isComingSoonRole(role) ? (
        <Alert tone="warning" title={tRoles(`${role}.comingSoonTitle`)} description={tRoles(`${role}.comingSoonBody`)} />
      ) : null}

      <GroupedList header={t("profileSection")}>
        <GroupedListItem>
          <span className="text-[var(--text-body)] text-[var(--ios-label)]">{t("roleLabel")}</span>
          <span className="flex flex-wrap items-center justify-end gap-2">
            <Badge tone="blue">{tRoles(`${role}.label`)}</Badge>
            {isMock ? <Badge tone="neutral">{tCommon("demoBadge")}</Badge> : null}
          </span>
        </GroupedListItem>
        <GroupedListItem>
          <span className="text-[var(--text-body)] text-[var(--ios-label)]">{t("accountLabel")}</span>
          <span className="truncate text-[var(--text-body)] text-[var(--ios-secondary-label)]">
            {user?.username}
          </span>
        </GroupedListItem>
        {user?.schoolId ? (
          <GroupedListItem>
            <span className="text-[var(--text-body)] text-[var(--ios-label)]">{t("schoolLabel")}</span>
            <span className="truncate text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
              {user.schoolId}
            </span>
          </GroupedListItem>
        ) : null}
      </GroupedList>

      <GroupedList header={t("scopeSection")}>
        {caps.map((cap) => (
          <GroupedListItem key={cap}>
            <span className="text-[var(--text-body)] text-[var(--ios-label)]">{tCaps(cap)}</span>
          </GroupedListItem>
        ))}
      </GroupedList>

      <GroupedList header={t("modulesSection")}>
        {modules.map(({ href, key, icon: Icon }) => (
          <GroupedListItem key={href} className="p-0">
            <Link
              href={href}
              className="pressable flex min-h-11 w-full cursor-pointer items-center gap-3 px-4 py-2.5 active:bg-[var(--ios-fill)] focus-visible:shadow-[var(--focus-ring)]"
            >
              <span className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]">
                <Icon className="size-4 stroke-[1.75]" aria-hidden />
              </span>
              <span className="flex-1 text-[var(--text-body)] text-[var(--ios-label)]">
                {tNav(key)}
              </span>
              <ChevronRight
                className="size-4 stroke-[1.75] text-[var(--ios-tertiary-label)]"
                aria-hidden
              />
            </Link>
          </GroupedListItem>
        ))}
      </GroupedList>
    </div>
  );
}
