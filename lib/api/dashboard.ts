import { apiRequest } from "./client";

export type DashboardLocalizedText = { fr: string | null; en: string | null };

export type DashboardAcademicYear = {
  id: string;
  label: string;
  status: string;
  current: boolean;
  locked: boolean;
};

export type DashboardCounts = {
  activeStudents: number | null;
  activeStaff: number | null;
  enrolledStudents: number | null;
  openSessions: number | null;
  teacherAssignments: number | null;
  pendingReportSheets: number | null;
  pendingCorrections: number | null;
  unreadNotifications: number;
};

export type DashboardSessionBrief = {
  id: string;
  number: number;
  termNumber: number;
  shortLabel: string | null;
  name: DashboardLocalizedText | null;
  status: "PLANNED" | "OPEN" | "CLOSED";
  entryDeadline: string | null;
  examDate: string | null;
  deadlineSoon: boolean;
  deadlineOverdue: boolean;
};

export type DashboardSessionOverview = {
  open: number;
  closed: number;
  planned: number;
  total: number;
  openSessions: DashboardSessionBrief[];
  upcomingDeadlines: DashboardSessionBrief[];
};

export type DashboardReportSheetQueue = {
  termNumber: number;
  draft: number;
  submitted: number;
  visaSg: number;
  visaPrincipal: number;
  rejected: number;
  pendingReview: number;
};

export type DashboardEntryProgress = {
  expectedSheets: number;
  draftSheets: number;
  submittedSheets: number;
  lockedSheets: number;
  existingSheets: number;
  completionRatio: number;
};

export type DashboardEnrollmentByCycle = {
  cycle: string;
  enrolledCount: number;
};

export type DashboardEnrollmentOverview = {
  totalEnrolled: number;
  byCycle: DashboardEnrollmentByCycle[];
};

export type DashboardTeacherWorkload = {
  assignmentCount: number;
  classCount: number;
  weeklyHours: number;
};

export type DashboardNotificationBrief = {
  id: string;
  category: string;
  severity: string;
  title: DashboardLocalizedText;
  body: DashboardLocalizedText;
  createdAt: string;
  unread: boolean;
};

export type DashboardNotifications = {
  unreadCount: number;
  recent: DashboardNotificationBrief[];
};

export type DashboardSummary = {
  academicYear: DashboardAcademicYear | null;
  counts: DashboardCounts;
  sessions: DashboardSessionOverview | null;
  reportSheets: DashboardReportSheetQueue | null;
  entryProgress: DashboardEntryProgress | null;
  enrollments: DashboardEnrollmentOverview | null;
  teacherWorkload: DashboardTeacherWorkload | null;
  notifications: DashboardNotifications;
};

export async function fetchDashboardSummary(
  schoolId?: string | null,
): Promise<DashboardSummary> {
  const qs = schoolId?.trim()
    ? `?schoolId=${encodeURIComponent(schoolId.trim())}`
    : "";
  return apiRequest<DashboardSummary>(`/api/v1/dashboard/summary${qs}`);
}
