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
  /** Consultation + PDF de l’emploi du temps publié (tous les acteurs scolaires). */
  | "viewTimetable"
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
  | "approveGradeCorrections"
  | "reviewReportSheets"
  /** Visa Surveillant Général sur fiche de report (Q-38). */
  | "visaSupervisorReportSheet"
  | "visaPrincipalReportSheet"
  | "manageAdminAccounts"
  | "manageGradeTemplates"
  | "manageSchoolSettings"
  | "viewAuditJournal"
  | "managePlatform";

const ROLE_CAPS: Record<AppRole, UiCapability[]> = {
  STUDENT: ["viewOwnProfile", "viewOwnGrades", "downloadAnnualReport", "viewTimetable"],
  PARENT: ["viewOwnChildren", "viewOwnGrades", "downloadAnnualReport", "viewTimetable"],
  TEACHER: [
    "viewTeacherClasses",
    "editOpenSequenceGrades",
    "viewOwnProfile",
    "viewTimetable",
  ],
  SURVEILLANT_GENERAL: [
    "reviewReportSheets",
    "visaSupervisorReportSheet",
    "viewOwnProfile",
    "viewTimetable",
  ],
  ADMINISTRATION: [
    "reviewReportSheets",
    "visaSupervisorReportSheet",
    "manageSchoolStructure",
    "manageStaff",
    "manageStudents",
    "manageEnrollments",
    "viewTimetable",
    "manageTimetable",
    "manageReportCards",
    "manageAbsences",
    "editOpenSequenceGrades",
    "manageSchoolSettings",
    "viewAuditJournal",
  ],
  DIRECTOR: [
    "reviewReportSheets",
    "visaSupervisorReportSheet",
    "visaPrincipalReportSheet",
    "approveGradeCorrections",
    "manageSchoolStructure",
    "manageStaff",
    "manageStudents",
    "manageEnrollments",
    "viewTimetable",
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
    "reviewReportSheets",
    "visaSupervisorReportSheet",
    "visaPrincipalReportSheet",
    "approveGradeCorrections",
    "manageSchoolStructure",
    "manageStaff",
    "manageStudents",
    "manageEnrollments",
    "viewTimetable",
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
