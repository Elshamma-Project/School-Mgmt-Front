"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole, type AppRole } from "@/types/auth";

type ModuleNamespace = "staff" | "students" | "academic";

type ModulePlaceholderProps = {
  namespace: ModuleNamespace;
  icon: LucideIcon;
  allowedRoles: AppRole[];
};

export function ModulePlaceholder({
  namespace,
  icon: Icon,
  allowedRoles,
}: ModulePlaceholderProps) {
  const t = useTranslations(namespace);
  const tRoles = useTranslations("roles");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const role = primaryRole(user);
  const allowed = role ? allowedRoles.includes(role) : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={
          role && allowed
            ? tRoles(`${role}.${namespace}Blurb`)
            : t("description")
        }
      />
      <EmptyState
        title={allowed ? tCommon("emptyTitle") : tCommon("accessDeniedTitle")}
        description={
          allowed ? tCommon("emptyDescription") : tCommon("accessDeniedDescription")
        }
        icon={<Icon className="size-10 stroke-[1.5]" aria-hidden />}
      />
    </div>
  );
}
