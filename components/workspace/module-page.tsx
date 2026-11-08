"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

type ModulePageProps = {
  /** Namespace i18n sous `workspace.<ns>` */
  ns: string;
  icon: LucideIcon;
};

export function ModulePage({ ns, icon: Icon }: ModulePageProps) {
  const t = useTranslations(`workspace.${ns}`);
  const tCommon = useTranslations("common");
  const hint = t.has("hint") ? t("hint") : null;

  return (
    <div className="space-y-4 slide-up">
      <PageHeader description={t("description")} />
      {hint ? <Alert tone="info" title={hint} /> : null}
      <EmptyState
        title={tCommon("emptyTitle")}
        description={t("empty")}
        icon={<Icon className="size-10 stroke-[1.5]" aria-hidden />}
      />
    </div>
  );
}
