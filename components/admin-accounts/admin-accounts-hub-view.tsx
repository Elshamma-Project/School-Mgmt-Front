"use client";

import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";

/**
 * Comptes d’administration — l’API `GET /users` n’existe pas encore (création / get by id seulement).
 * Hub structurel en attendant la liste paginée.
 */
export function AdminAccountsHubView() {
  const t = useTranslations("adminAccountsHub");

  return (
    <div className="space-y-5 slide-up">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <StatCard
          label={t("stats.accounts")}
          value={0}
          tone="blue"
          icon={<UserRound className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.active")}
          value={0}
          tone="green"
          icon={<UserRound className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
      </div>

      <EmptyState
        title={t("empty.title")}
        description={t("empty.description")}
        icon={<UserRound className="size-9 stroke-[1.5]" aria-hidden />}
      />
    </div>
  );
}
