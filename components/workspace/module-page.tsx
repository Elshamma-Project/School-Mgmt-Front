"use client";

import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

const MODULE_ICONS = {
  teacherClasses: BookOpen,
  teacherGrades: ClipboardList,
  teacherTimetable: CalendarDays,
  parentChildren: Users,
  parentGrades: ClipboardList,
  parentReportCards: FileSpreadsheet,
  parentTimetable: CalendarDays,
  adminStudents: GraduationCap,
  adminStaff: Users,
  adminAcademic: BookOpen,
  adminGrades: ClipboardList,
  adminReporting: FileSpreadsheet,
  adminTimetable: CalendarDays,
  directorStudents: GraduationCap,
  directorStaff: Users,
  directorAcademic: BookOpen,
  directorSequences: Shield,
  directorReporting: FileSpreadsheet,
  directorAdminAccounts: UserRound,
  directorTimetable: CalendarDays,
  superSchools: Building2,
  superPlatform: Shield,
  superAudit: ClipboardList,
  studentGrades: ClipboardList,
  studentReportCards: FileSpreadsheet,
  studentTimetable: CalendarDays,
} as const;

export type WorkspaceModuleNs = keyof typeof MODULE_ICONS;

type ModulePageProps = {
  ns: WorkspaceModuleNs;
};

export function ModulePage({ ns }: ModulePageProps) {
  const t = useTranslations(`workspace.${ns}`);
  const tCommon = useTranslations("common");
  const hint = t.has("hint") ? t("hint") : null;
  const Icon = MODULE_ICONS[ns];

  return (
    <div className="space-y-6 slide-up">
      <PageHeader description={t("description")} />
      {hint ? <Alert tone="info" title={hint} /> : null}
      <EmptyState
        title={tCommon("emptyTitle")}
        description={t("empty")}
        icon={<Icon className="size-9 stroke-[1.5]" aria-hidden />}
      />
    </div>
  );
}
