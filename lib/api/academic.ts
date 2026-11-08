import { apiRequest } from "./client";

export type LocalizedTextDto = {
  fr: string | null;
  en: string | null;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AcademicYearResponse = {
  id: string;
  schoolId: string;
  label: string;
  startDate: string;
  endDate: string;
  current: boolean;
  status: "PLANNED" | "ACTIVE" | "CLOSED";
  terms: Array<{
    number: number;
    name: LocalizedTextDto;
    startDate: string;
    endDate: string;
  }>;
};

export type LevelResponse = {
  id: string;
  schoolId: string;
  code: string;
  name: LocalizedTextDto;
  cycle: string;
  section: "FR" | "EN";
  order: number;
  equivalenceIndex: number | null;
  nextLevelCode: string | null;
  defaultGradingSchemeId: string | null;
  active: boolean;
};

export type SchoolClassResponse = {
  id: string;
  schoolId: string;
  academicYearId: string;
  levelId: string;
  levelCode: string;
  section: "FR" | "EN";
  cycle: string;
  name: string;
  trackCode: string | null;
  capacity: number | null;
  mainTeacherId: string | null;
  homeRoomId: string | null;
  defaultLanguage: "FR" | "EN";
  availableLanguages: Array<"FR" | "EN">;
  gradingSchemeId: string | null;
  active: boolean;
};

export type SubjectResponse = {
  id: string;
  schoolId: string;
  code: string;
  name: LocalizedTextDto;
  shortName: LocalizedTextDto | null;
  timetableAlias: string | null;
  kind: "ACADEMIC" | "ACTIVITY";
  teachingLanguage: "FR" | "EN" | null;
  active: boolean;
};

export type SubjectGroupResponse = {
  id: string;
  schoolId: string;
  code: string;
  name: LocalizedTextDto;
  displayOrder: number;
  active: boolean;
};

export type RoomResponse = {
  id: string;
  schoolId: string;
  name: string;
  type: string;
  capacity: number | null;
  active: boolean;
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

function schoolQuery(schoolId?: string | null): Record<string, string> {
  return schoolId?.trim() ? { schoolId: schoolId.trim() } : {};
}

function toSearch(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  return search.toString();
}

export async function listAcademicYears(options: {
  page?: number;
  size?: number;
  schoolId?: string | null;
} = {}): Promise<PageResponse<AcademicYearResponse>> {
  const qs = toSearch({
    page: options.page ?? 0,
    size: options.size ?? 20,
    ...schoolQuery(options.schoolId),
  });
  return apiRequest<PageResponse<AcademicYearResponse>>(`/api/v1/academic-years?${qs}`);
}

export async function listLevels(options: {
  page?: number;
  size?: number;
  active?: boolean | null;
  schoolId?: string | null;
} = {}): Promise<PageResponse<LevelResponse>> {
  const qs = toSearch({
    page: options.page ?? 0,
    size: options.size ?? 100,
    active: options.active ?? null,
    ...schoolQuery(options.schoolId),
  });
  return apiRequest<PageResponse<LevelResponse>>(`/api/v1/levels?${qs}`);
}

export async function listClasses(options: {
  academicYearId: string;
  page?: number;
  size?: number;
  active?: boolean | null;
  schoolId?: string | null;
}): Promise<PageResponse<SchoolClassResponse>> {
  const qs = toSearch({
    academicYearId: options.academicYearId,
    page: options.page ?? 0,
    size: options.size ?? 100,
    active: options.active ?? null,
    ...schoolQuery(options.schoolId),
  });
  return apiRequest<PageResponse<SchoolClassResponse>>(`/api/v1/classes?${qs}`);
}

export async function listSubjects(options: {
  page?: number;
  size?: number;
  active?: boolean | null;
  schoolId?: string | null;
} = {}): Promise<PageResponse<SubjectResponse>> {
  const qs = toSearch({
    page: options.page ?? 0,
    size: options.size ?? 100,
    active: options.active ?? null,
    ...schoolQuery(options.schoolId),
  });
  return apiRequest<PageResponse<SubjectResponse>>(`/api/v1/subjects?${qs}`);
}

export async function listSubjectGroups(options: {
  page?: number;
  size?: number;
  active?: boolean | null;
  schoolId?: string | null;
} = {}): Promise<PageResponse<SubjectGroupResponse>> {
  const qs = toSearch({
    page: options.page ?? 0,
    size: options.size ?? 100,
    active: options.active ?? null,
    ...schoolQuery(options.schoolId),
  });
  return apiRequest<PageResponse<SubjectGroupResponse>>(`/api/v1/subject-groups?${qs}`);
}

export async function listRooms(options: {
  page?: number;
  size?: number;
  active?: boolean | null;
  schoolId?: string | null;
} = {}): Promise<PageResponse<RoomResponse>> {
  const qs = toSearch({
    page: options.page ?? 0,
    size: options.size ?? 100,
    active: options.active ?? null,
    ...schoolQuery(options.schoolId),
  });
  return apiRequest<PageResponse<RoomResponse>>(`/api/v1/rooms?${qs}`);
}

export async function listTeacherAssignments(
  teacherId: string,
  options: { schoolId?: string | null; academicYearId?: string | null } = {},
): Promise<TeacherAssignmentResponse[]> {
  const qs = toSearch({
    teacherId,
    academicYearId: options.academicYearId ?? null,
    ...schoolQuery(options.schoolId),
  });
  return apiRequest<TeacherAssignmentResponse[]>(`/api/v1/class-subjects/by-teacher?${qs}`);
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
