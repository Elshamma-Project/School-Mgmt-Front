import { apiRequest } from "./client";

export type LocalizedTextDto = {
  fr: string | null;
  en: string | null;
};

export type TeacherAssignmentResponse = {
  classSubjectId: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectCode: string;
  subjectName: LocalizedTextDto;
  coefficient: string | number;
  weeklyHours: number | null;
  active: boolean;
};

export async function listTeacherAssignments(
  teacherId: string,
  options: { schoolId?: string | null; academicYearId?: string | null } = {},
): Promise<TeacherAssignmentResponse[]> {
  const search = new URLSearchParams();
  search.set("teacherId", teacherId);
  if (options.schoolId?.trim()) search.set("schoolId", options.schoolId.trim());
  if (options.academicYearId?.trim()) {
    search.set("academicYearId", options.academicYearId.trim());
  }
  return apiRequest<TeacherAssignmentResponse[]>(
    `/api/v1/class-subjects/by-teacher?${search.toString()}`,
  );
}

export function localizedLabel(
  text: LocalizedTextDto | null | undefined,
  locale: string,
  fallback = "—",
): string {
  if (!text) return fallback;
  const preferFr = locale.toLowerCase().startsWith("fr");
  const primary = preferFr ? text.fr : text.en;
  const secondary = preferFr ? text.en : text.fr;
  return primary?.trim() || secondary?.trim() || fallback;
}
