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

export type CycleCode =
  | "MATERNELLE"
  | "PRIMAIRE"
  | "SECONDAIRE_1ER_CYCLE"
  | "SECONDAIRE_2ND_CYCLE";

export type SectionCode = "FRANCOPHONE" | "ANGLOPHONE" | "BILINGUAL";

export type RoomTypeCode =
  | "CLASSROOM"
  | "LABORATORY"
  | "COMPUTER_LAB"
  | "SPORTS"
  | "WORKSHOP"
  | "HALL"
  | "OTHER";

export type LevelResponse = {
  id: string;
  schoolId: string;
  code: string;
  name: LocalizedTextDto;
  cycle: CycleCode | string;
  section: SectionCode | string;
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
  section: SectionCode | string;
  cycle: CycleCode | string;
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

/** Matière affectée à une classe (coefficient, groupe bulletin…). */
export type ClassSubjectResponse = {
  id: string;
  schoolId: string;
  academicYearId: string;
  classId: string;
  subjectId: string;
  groupId: string;
  coefficient: string | number;
  teacherId: string | null;
  weeklyHours: number | null;
  teachingLanguage: "FR" | "EN" | null;
  displayOrder: number;
  maxScore: string | number;
  countsInAverage: boolean;
  optional: boolean;
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

export async function listClassSubjects(options: {
  classId: string;
  page?: number;
  size?: number;
  active?: boolean | null;
  schoolId?: string | null;
}): Promise<PageResponse<ClassSubjectResponse>> {
  const qs = toSearch({
    classId: options.classId,
    page: options.page ?? 0,
    size: options.size ?? 100,
    active: options.active ?? null,
    ...schoolQuery(options.schoolId),
  });
  return apiRequest<PageResponse<ClassSubjectResponse>>(`/api/v1/class-subjects?${qs}`);
}

export type CreateClassSubjectPayload = {
  academicYearId: string;
  classId: string;
  subjectId: string;
  groupId: string;
  coefficient: string | number;
  teacherId?: string | null;
  weeklyHours?: number | null;
  teachingLanguage?: "FR" | "EN" | null;
  displayOrder?: number;
  maxScore?: string | number;
  countsInAverage?: boolean;
  optional?: boolean;
  schoolId?: string | null;
};

export type UpdateClassSubjectPayload = {
  groupId: string;
  coefficient: string | number;
  teacherId?: string | null;
  weeklyHours?: number | null;
  teachingLanguage?: "FR" | "EN" | null;
  displayOrder?: number;
  maxScore?: string | number;
  countsInAverage?: boolean;
  optional?: boolean;
};

export async function createClassSubject(
  payload: CreateClassSubjectPayload,
): Promise<ClassSubjectResponse> {
  return apiRequest<ClassSubjectResponse>("/api/v1/class-subjects", {
    method: "POST",
    body: payload,
  });
}

export async function updateClassSubject(
  id: string,
  payload: UpdateClassSubjectPayload,
  schoolId?: string | null,
): Promise<ClassSubjectResponse> {
  return apiRequest<ClassSubjectResponse>(
    `/api/v1/class-subjects/${encodeURIComponent(id)}${schoolQs(schoolId)}`,
    { method: "PUT", body: payload },
  );
}

export async function deactivateClassSubject(
  id: string,
  schoolId?: string | null,
): Promise<ClassSubjectResponse> {
  return apiRequest<ClassSubjectResponse>(
    `/api/v1/class-subjects/${encodeURIComponent(id)}/deactivate${schoolQs(schoolId)}`,
    { method: "POST" },
  );
}

export async function reactivateClassSubject(
  id: string,
  schoolId?: string | null,
): Promise<ClassSubjectResponse> {
  return apiRequest<ClassSubjectResponse>(
    `/api/v1/class-subjects/${encodeURIComponent(id)}/reactivate${schoolQs(schoolId)}`,
    { method: "POST" },
  );
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

export type CreateLevelPayload = {
  code: string;
  name: LocalizedTextDto;
  cycle: CycleCode;
  section: SectionCode;
  order: number;
  nextLevelCode?: string | null;
  schoolId?: string | null;
};

export type CreateSchoolClassPayload = {
  academicYearId: string;
  levelId: string;
  name: string;
  trackCode?: string | null;
  capacity?: number | null;
  defaultLanguage: "FR" | "EN";
  availableLanguages?: Array<"FR" | "EN">;
  gradingSchemeId?: string | null;
  homeRoomId?: string | null;
  schoolId?: string | null;
};

export type CreateSubjectPayload = {
  code: string;
  name: LocalizedTextDto;
  shortName?: LocalizedTextDto | null;
  kind?: "ACADEMIC" | "ACTIVITY";
  teachingLanguage?: "FR" | "EN" | null;
  schoolId?: string | null;
};

export type CreateSubjectGroupPayload = {
  code: string;
  name: LocalizedTextDto;
  displayOrder?: number;
  schoolId?: string | null;
};

export type CreateRoomPayload = {
  name: string;
  type?: RoomTypeCode;
  capacity?: number | null;
  schoolId?: string | null;
};

export async function createLevel(payload: CreateLevelPayload): Promise<LevelResponse> {
  return apiRequest<LevelResponse>("/api/v1/levels", {
    method: "POST",
    body: payload,
  });
}

export async function createSchoolClass(
  payload: CreateSchoolClassPayload,
): Promise<SchoolClassResponse> {
  return apiRequest<SchoolClassResponse>("/api/v1/classes", {
    method: "POST",
    body: payload,
  });
}

export async function createSubject(payload: CreateSubjectPayload): Promise<SubjectResponse> {
  return apiRequest<SubjectResponse>("/api/v1/subjects", {
    method: "POST",
    body: payload,
  });
}

export async function createSubjectGroup(
  payload: CreateSubjectGroupPayload,
): Promise<SubjectGroupResponse> {
  return apiRequest<SubjectGroupResponse>("/api/v1/subject-groups", {
    method: "POST",
    body: payload,
  });
}

export async function createRoom(payload: CreateRoomPayload): Promise<RoomResponse> {
  return apiRequest<RoomResponse>("/api/v1/rooms", {
    method: "POST",
    body: payload,
  });
}

function schoolQs(schoolId?: string | null): string {
  return schoolId?.trim() ? `?schoolId=${encodeURIComponent(schoolId.trim())}` : "";
}

export async function getLevel(id: string, schoolId?: string | null): Promise<LevelResponse> {
  return apiRequest<LevelResponse>(`/api/v1/levels/${encodeURIComponent(id)}${schoolQs(schoolId)}`);
}

export async function getSchoolClass(
  id: string,
  schoolId?: string | null,
): Promise<SchoolClassResponse> {
  return apiRequest<SchoolClassResponse>(
    `/api/v1/classes/${encodeURIComponent(id)}${schoolQs(schoolId)}`,
  );
}

export async function getSubject(id: string, schoolId?: string | null): Promise<SubjectResponse> {
  return apiRequest<SubjectResponse>(
    `/api/v1/subjects/${encodeURIComponent(id)}${schoolQs(schoolId)}`,
  );
}

export async function getSubjectGroup(
  id: string,
  schoolId?: string | null,
): Promise<SubjectGroupResponse> {
  return apiRequest<SubjectGroupResponse>(
    `/api/v1/subject-groups/${encodeURIComponent(id)}${schoolQs(schoolId)}`,
  );
}

export async function getRoom(id: string, schoolId?: string | null): Promise<RoomResponse> {
  return apiRequest<RoomResponse>(`/api/v1/rooms/${encodeURIComponent(id)}${schoolQs(schoolId)}`);
}

export type UpdateLevelPayload = {
  name: LocalizedTextDto;
  cycle: CycleCode;
  section: SectionCode;
  order: number;
  nextLevelCode?: string | null;
  equivalenceIndex?: number | null;
  defaultGradingSchemeId?: string | null;
};

export type UpdateSchoolClassPayload = {
  name: string;
  trackCode?: string | null;
  capacity?: number | null;
  defaultLanguage: "FR" | "EN";
  availableLanguages?: Array<"FR" | "EN">;
  gradingSchemeId?: string | null;
  homeRoomId?: string | null;
  mainTeacherId?: string | null;
};

export type UpdateSubjectPayload = {
  name: LocalizedTextDto;
  shortName?: LocalizedTextDto | null;
  kind?: "ACADEMIC" | "ACTIVITY";
  teachingLanguage?: "FR" | "EN" | null;
  timetableAlias?: string | null;
};

export type UpdateSubjectGroupPayload = {
  name: LocalizedTextDto;
  displayOrder?: number;
};

export type UpdateRoomPayload = {
  name: string;
  type?: RoomTypeCode;
  capacity?: number | null;
};

export async function updateLevel(
  id: string,
  payload: UpdateLevelPayload,
  schoolId?: string | null,
): Promise<LevelResponse> {
  return apiRequest<LevelResponse>(
    `/api/v1/levels/${encodeURIComponent(id)}${schoolQs(schoolId)}`,
    { method: "PUT", body: payload },
  );
}

export async function updateSchoolClass(
  id: string,
  payload: UpdateSchoolClassPayload,
  schoolId?: string | null,
): Promise<SchoolClassResponse> {
  return apiRequest<SchoolClassResponse>(
    `/api/v1/classes/${encodeURIComponent(id)}${schoolQs(schoolId)}`,
    { method: "PUT", body: payload },
  );
}

export async function updateSubject(
  id: string,
  payload: UpdateSubjectPayload,
  schoolId?: string | null,
): Promise<SubjectResponse> {
  return apiRequest<SubjectResponse>(
    `/api/v1/subjects/${encodeURIComponent(id)}${schoolQs(schoolId)}`,
    { method: "PUT", body: payload },
  );
}

export async function updateSubjectGroup(
  id: string,
  payload: UpdateSubjectGroupPayload,
  schoolId?: string | null,
): Promise<SubjectGroupResponse> {
  return apiRequest<SubjectGroupResponse>(
    `/api/v1/subject-groups/${encodeURIComponent(id)}${schoolQs(schoolId)}`,
    { method: "PUT", body: payload },
  );
}

export async function updateRoom(
  id: string,
  payload: UpdateRoomPayload,
  schoolId?: string | null,
): Promise<RoomResponse> {
  return apiRequest<RoomResponse>(
    `/api/v1/rooms/${encodeURIComponent(id)}${schoolQs(schoolId)}`,
    { method: "PUT", body: payload },
  );
}

async function postLifecycle<T>(
  collection: string,
  id: string,
  action: "deactivate" | "reactivate",
  schoolId?: string | null,
): Promise<T> {
  return apiRequest<T>(
    `/api/v1/${collection}/${encodeURIComponent(id)}/${action}${schoolQs(schoolId)}`,
    { method: "POST" },
  );
}

export const deactivateLevel = (id: string, schoolId?: string | null) =>
  postLifecycle<LevelResponse>("levels", id, "deactivate", schoolId);
export const reactivateLevel = (id: string, schoolId?: string | null) =>
  postLifecycle<LevelResponse>("levels", id, "reactivate", schoolId);

export const deactivateSchoolClass = (id: string, schoolId?: string | null) =>
  postLifecycle<SchoolClassResponse>("classes", id, "deactivate", schoolId);
export const reactivateSchoolClass = (id: string, schoolId?: string | null) =>
  postLifecycle<SchoolClassResponse>("classes", id, "reactivate", schoolId);

export const deactivateSubject = (id: string, schoolId?: string | null) =>
  postLifecycle<SubjectResponse>("subjects", id, "deactivate", schoolId);
export const reactivateSubject = (id: string, schoolId?: string | null) =>
  postLifecycle<SubjectResponse>("subjects", id, "reactivate", schoolId);

export const deactivateSubjectGroup = (id: string, schoolId?: string | null) =>
  postLifecycle<SubjectGroupResponse>("subject-groups", id, "deactivate", schoolId);
export const reactivateSubjectGroup = (id: string, schoolId?: string | null) =>
  postLifecycle<SubjectGroupResponse>("subject-groups", id, "reactivate", schoolId);

export const deactivateRoom = (id: string, schoolId?: string | null) =>
  postLifecycle<RoomResponse>("rooms", id, "deactivate", schoolId);
export const reactivateRoom = (id: string, schoolId?: string | null) =>
  postLifecycle<RoomResponse>("rooms", id, "reactivate", schoolId);

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
