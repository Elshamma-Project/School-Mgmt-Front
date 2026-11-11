import type { AppRole } from "@/types/auth";

/**
 * Capacités UI (indicatives) — le serveur reste la source de vérité
 * (`docs/05-roles-permissions.md`).
 */
export type UiCapability =
  | "viewOwnProfile"
  | "viewOwnChildren"
  | "viewOwnGrades"
  | "downloadAnnualReport"
  | "viewTeacherClasses"
  | "editOpenSequenceGrades"
  | "manageSchoolStructure"
  | "manageStaff"
  | "manageStudents"
  | "manageEnrollments"
  | "manageTimetable"
  | "manageReportCards"
  | "manageAbsences"
  | "reopenClosedSequence"
  | "manageAdminAccounts"
  | "manageGradeTemplates"
  | "manageSchoolSettings"
  | "viewAuditJournal"
  | "managePlatform";

const ROLE_CAPS: Record<AppRole, UiCapability[]> = {
  STUDENT: ["viewOwnProfile", "viewOwnGrades", "downloadAnnualReport"],
  PARENT: ["viewOwnChildren", "viewOwnGrades", "downloadAnnualReport"],
  TEACHER: ["viewTeacherClasses", "editOpenSequenceGrades", "viewOwnProfile"],
  SURVEILLANT_GENERAL: [
    "manageReportCards",
    "viewAuditJournal",
    "viewOwnProfile",
  ],
  ADMINISTRATION: [
    "manageSchoolStructure",
    "manageStaff",
    "manageStudents",
    "manageEnrollments",
    "manageTimetable",
    "manageReportCards",
    "manageAbsences",
    "editOpenSequenceGrades",
    "manageSchoolSettings",
    "viewAuditJournal",
  ],
  DIRECTOR: [
    "manageSchoolStructure",
    "manageStaff",
    "manageStudents",
    "manageEnrollments",
    "manageTimetable",
    "manageReportCards",
    "manageAbsences",
    "editOpenSequenceGrades",
    "reopenClosedSequence",
    "manageAdminAccounts",
    "manageGradeTemplates",
    "manageSchoolSettings",
    "viewAuditJournal",
  ],
  SUPER_ADMIN: [
    "manageSchoolStructure",
    "manageStaff",
    "manageStudents",
    "manageEnrollments",
    "manageTimetable",
    "manageReportCards",
    "manageAbsences",
    "editOpenSequenceGrades",
    "reopenClosedSequence",
    "manageAdminAccounts",
    "manageGradeTemplates",
    "manageSchoolSettings",
    "viewAuditJournal",
    "managePlatform",
  ],
};

export function roleHasCapability(role: AppRole, capability: UiCapability): boolean {
  return ROLE_CAPS[role].includes(capability);
}

export function listCapabilities(role: AppRole): UiCapability[] {
  return ROLE_CAPS[role];
}

/** Droit effectif = union des rôles du compte (docs/05). */
export function userHasCapability(
  roles: readonly AppRole[] | null | undefined,
  capability: UiCapability,
): boolean {
  if (!roles?.length) return false;
  return roles.some((role) => roleHasCapability(role, capability));
}
