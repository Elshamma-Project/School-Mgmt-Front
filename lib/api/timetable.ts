import { getTenantConfig } from "@/lib/tenant/config";
import { openSecret } from "@/lib/auth/token-vault";
import { useAuthStore } from "@/stores/auth-store";
import { apiRequest } from "./client";
import type { LocalizedTextDto, SectionCode } from "./academic";

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type PeriodKind = "LESSON" | "BREAK" | "CLEANUP" | "CLOSING" | "ASSEMBLY";
export type TimetableStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type EntryKind = "LESSON" | "ACTIVITY";
export type ActivityType =
  | "CLUB"
  | "LIBRARY"
  | "MUSIC"
  | "CHINESE"
  | "GENERAL_CLEANING"
  | "STUDY_HALL"
  | "OTHER";
export type TimetableIssueSeverity = "BLOCKING" | "WARNING";

export type ContactInfoDto = {
  phones: string[];
  email: string | null;
  address: string | null;
  city: string | null;
};

export type GridPeriodDto = {
  number: number | null;
  kind: PeriodKind;
  start: string;
  end: string;
  label: LocalizedTextDto | null;
};

export type TimeSlotGridResponse = {
  id: string;
  schoolId: string;
  academicYearId: string;
  name: string;
  days: DayOfWeek[];
  periods: GridPeriodDto[];
  active: boolean;
};

export type CreateTimeSlotGridRequest = {
  academicYearId: string;
  name: string;
  days: DayOfWeek[];
  periods: GridPeriodDto[];
  active?: boolean;
  schoolId?: string | null;
};

export type UpdateTimeSlotGridRequest = {
  name: string;
  days: DayOfWeek[];
  periods: GridPeriodDto[];
  active?: boolean;
};

export type TimetableResponse = {
  id: string;
  schoolId: string;
  academicYearId: string;
  gridId: string;
  revision: number;
  status: TimetableStatus;
  generatedAt: string | null;
  generatedBy: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  headerContact: ContactInfoDto | null;
  note: string | null;
};

export type CreateTimetableRequest = {
  academicYearId: string;
  gridId: string;
  headerContact?: ContactInfoDto | null;
  note?: string | null;
  schoolId?: string | null;
};

export type UpdateTimetableRequest = {
  headerContact?: ContactInfoDto | null;
  note?: string | null;
};

export type TimetableEntryResponse = {
  id: string;
  schoolId: string;
  academicYearId: string;
  timetableId: string;
  classId: string;
  day: DayOfWeek;
  startPeriod: number | null;
  periodCount: number;
  customStart: string | null;
  customEnd: string | null;
  slotKey: string;
  kind: EntryKind;
  classSubjectIds: string[];
  subjectId: string | null;
  teacherId: string | null;
  roomId: string | null;
  activityType: ActivityType | null;
  sessionGroupId: string | null;
  optionGroupCode: string | null;
  optionCode: string;
  label: LocalizedTextDto | null;
  note: string | null;
  subjectLabel: string | null;
  teacherLabel: string | null;
};

export type UpsertTimetableEntryRequest = {
  classId: string;
  day: DayOfWeek;
  startPeriod?: number | null;
  periodCount?: number;
  customStart?: string | null;
  customEnd?: string | null;
  kind?: EntryKind;
  classSubjectIds?: string[];
  subjectId?: string | null;
  teacherId?: string | null;
  roomId?: string | null;
  activityType?: ActivityType | null;
  sessionGroupId?: string | null;
  optionGroupCode?: string | null;
  optionCode?: string;
  label?: LocalizedTextDto | null;
  note?: string | null;
  subjectLabel?: string | null;
  teacherLabel?: string | null;
  schoolId?: string | null;
};

export type TimetableIssueDto = {
  severity: TimetableIssueSeverity;
  code: string;
  message: string;
  entryId?: string | null;
  otherEntryId?: string | null;
  classId?: string | null;
  teacherId?: string | null;
  roomId?: string | null;
  classSubjectId?: string | null;
};

export type TimetableEntryWriteResponse = {
  entry: TimetableEntryResponse;
  warnings: TimetableIssueDto[];
};

export type TimetableConflictsResponse = {
  timetableId: string;
  blocking: TimetableIssueDto[];
  warnings: TimetableIssueDto[];
};

export type DuplicateTimetableRequest = {
  targetAcademicYearId: string;
  targetGridId?: string | null;
  schoolId?: string | null;
};

export type LinkSessionGroupRequest = {
  entryIds: string[];
  schoolId?: string | null;
};

export type SessionGroupResponse = {
  sessionGroupId: string;
  entryIds: string[];
};

export type TimetableSubjectAliasResponse = {
  id: string;
  schoolId: string;
  academicYearId: string;
  section: SectionCode | null;
  sectionKey: string;
  aliasNormalized: string;
  aliasVariants: string[];
  classSubjectIds: string[];
  unresolved: boolean;
  note: string | null;
  active: boolean;
};

export type UpsertTimetableSubjectAliasRequest = {
  academicYearId: string;
  section?: SectionCode | null;
  aliasNormalized: string;
  aliasVariants?: string[];
  classSubjectIds?: string[];
  unresolved?: boolean;
  note?: string | null;
  active?: boolean;
  schoolId?: string | null;
};

function schoolParams(schoolId?: string | null): Record<string, string> {
  return schoolId ? { schoolId } : {};
}

function toSearch(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  return search.toString();
}

export async function listTimeSlotGrids(options: {
  academicYearId: string;
  activeOnly?: boolean;
  schoolId?: string | null;
}): Promise<TimeSlotGridResponse[]> {
  const qs = toSearch({
    academicYearId: options.academicYearId,
    activeOnly: options.activeOnly ?? false,
    ...schoolParams(options.schoolId),
  });
  return apiRequest<TimeSlotGridResponse[]>(`/api/v1/timetable-grids?${qs}`);
}

export async function createTimeSlotGrid(
  payload: CreateTimeSlotGridRequest,
): Promise<TimeSlotGridResponse> {
  return apiRequest<TimeSlotGridResponse>("/api/v1/timetable-grids", {
    method: "POST",
    body: payload,
  });
}

export async function updateTimeSlotGrid(
  id: string,
  payload: UpdateTimeSlotGridRequest,
  schoolId?: string | null,
): Promise<TimeSlotGridResponse> {
  const qs = toSearch(schoolParams(schoolId));
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<TimeSlotGridResponse>(`/api/v1/timetable-grids/${encodeURIComponent(id)}${suffix}`, {
    method: "PUT",
    body: payload,
  });
}

export async function listTimetables(options: {
  academicYearId: string;
  schoolId?: string | null;
}): Promise<TimetableResponse[]> {
  const qs = toSearch({
    academicYearId: options.academicYearId,
    ...schoolParams(options.schoolId),
  });
  return apiRequest<TimetableResponse[]>(`/api/v1/timetables?${qs}`);
}

export async function createTimetableDraft(
  payload: CreateTimetableRequest,
): Promise<TimetableResponse> {
  return apiRequest<TimetableResponse>("/api/v1/timetables", {
    method: "POST",
    body: payload,
  });
}

export async function updateTimetableDraft(
  id: string,
  payload: UpdateTimetableRequest,
  schoolId?: string | null,
): Promise<TimetableResponse> {
  const qs = toSearch(schoolParams(schoolId));
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<TimetableResponse>(`/api/v1/timetables/${encodeURIComponent(id)}${suffix}`, {
    method: "PUT",
    body: payload,
  });
}

export async function publishTimetable(
  id: string,
  schoolId?: string | null,
): Promise<TimetableResponse> {
  const qs = toSearch(schoolParams(schoolId));
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<TimetableResponse>(
    `/api/v1/timetables/${encodeURIComponent(id)}/publish${suffix}`,
    { method: "POST" },
  );
}

export async function reviseTimetable(
  id: string,
  schoolId?: string | null,
): Promise<TimetableResponse> {
  const qs = toSearch(schoolParams(schoolId));
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<TimetableResponse>(
    `/api/v1/timetables/${encodeURIComponent(id)}/revise${suffix}`,
    { method: "POST" },
  );
}

export async function duplicateTimetable(
  id: string,
  payload: DuplicateTimetableRequest,
): Promise<TimetableResponse> {
  return apiRequest<TimetableResponse>(
    `/api/v1/timetables/${encodeURIComponent(id)}/duplicate`,
    { method: "POST", body: payload },
  );
}

export async function listTimetableEntries(options: {
  timetableId: string;
  classId?: string | null;
  teacherId?: string | null;
  schoolId?: string | null;
}): Promise<TimetableEntryResponse[]> {
  const qs = toSearch({
    classId: options.classId ?? null,
    teacherId: options.teacherId ?? null,
    ...schoolParams(options.schoolId),
  });
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<TimetableEntryResponse[]>(
    `/api/v1/timetables/${encodeURIComponent(options.timetableId)}/entries${suffix}`,
  );
}

export async function upsertTimetableEntry(
  timetableId: string,
  payload: UpsertTimetableEntryRequest,
): Promise<TimetableEntryWriteResponse> {
  return apiRequest<TimetableEntryWriteResponse>(
    `/api/v1/timetables/${encodeURIComponent(timetableId)}/entries`,
    { method: "POST", body: payload },
  );
}

export async function updateTimetableEntry(
  id: string,
  payload: UpsertTimetableEntryRequest,
  schoolId?: string | null,
): Promise<TimetableEntryWriteResponse> {
  const qs = toSearch(schoolParams(schoolId));
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<TimetableEntryWriteResponse>(
    `/api/v1/timetable-entries/${encodeURIComponent(id)}${suffix}`,
    { method: "PUT", body: payload },
  );
}

export async function deleteTimetableEntry(
  id: string,
  schoolId?: string | null,
): Promise<void> {
  const qs = toSearch(schoolParams(schoolId));
  const suffix = qs ? `?${qs}` : "";
  await apiRequest<void>(`/api/v1/timetable-entries/${encodeURIComponent(id)}${suffix}`, {
    method: "DELETE",
    responseType: "void",
  });
}

export async function getTimetableConflicts(
  timetableId: string,
  schoolId?: string | null,
): Promise<TimetableConflictsResponse> {
  const qs = toSearch(schoolParams(schoolId));
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<TimetableConflictsResponse>(
    `/api/v1/timetables/${encodeURIComponent(timetableId)}/conflicts${suffix}`,
  );
}

export async function linkSessionGroup(
  timetableId: string,
  payload: LinkSessionGroupRequest,
): Promise<SessionGroupResponse> {
  return apiRequest<SessionGroupResponse>(
    `/api/v1/timetables/${encodeURIComponent(timetableId)}/session-groups`,
    { method: "POST", body: payload },
  );
}

export async function unlinkSessionGroup(
  timetableId: string,
  sessionGroupId: string,
  entryIds: string[] = [],
  schoolId?: string | null,
): Promise<SessionGroupResponse> {
  return apiRequest<SessionGroupResponse>(
    `/api/v1/timetables/${encodeURIComponent(timetableId)}/session-groups/${encodeURIComponent(sessionGroupId)}/unlink`,
    { method: "POST", body: { entryIds, schoolId: schoolId ?? null } },
  );
}

export async function listTimetableSubjectAliases(options: {
  academicYearId: string;
  schoolId?: string | null;
}): Promise<TimetableSubjectAliasResponse[]> {
  const qs = toSearch({
    academicYearId: options.academicYearId,
    ...schoolParams(options.schoolId),
  });
  return apiRequest<TimetableSubjectAliasResponse[]>(
    `/api/v1/timetable-subject-aliases?${qs}`,
  );
}

export async function upsertTimetableSubjectAlias(
  payload: UpsertTimetableSubjectAliasRequest,
): Promise<TimetableSubjectAliasResponse> {
  return apiRequest<TimetableSubjectAliasResponse>("/api/v1/timetable-subject-aliases", {
    method: "POST",
    body: payload,
  });
}

export async function deactivateTimetableSubjectAlias(
  id: string,
  schoolId?: string | null,
): Promise<TimetableSubjectAliasResponse> {
  const qs = toSearch(schoolParams(schoolId));
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<TimetableSubjectAliasResponse>(
    `/api/v1/timetable-subject-aliases/${encodeURIComponent(id)}${suffix}`,
    { method: "DELETE" },
  );
}

export type TimetableChangeKind = "UPDATE" | "REMOVE" | "ADD";
export type TimetableChangeStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type TimetableEntrySnapshotDto = {
  classId: string;
  day: DayOfWeek;
  startPeriod?: number | null;
  periodCount?: number;
  customStart?: string | null;
  customEnd?: string | null;
  kind?: EntryKind;
  classSubjectIds?: string[];
  subjectId?: string | null;
  teacherId?: string | null;
  roomId?: string | null;
  activityType?: ActivityType | null;
  sessionGroupId?: string | null;
  optionGroupCode?: string | null;
  optionCode?: string;
  label?: LocalizedTextDto | null;
  note?: string | null;
  subjectLabel?: string | null;
  teacherLabel?: string | null;
};

export type CreateTimetableChangeRequest = {
  sourceTimetableId: string;
  sourceEntryId?: string | null;
  changeKind: TimetableChangeKind;
  proposed: TimetableEntrySnapshotDto;
  reason: string;
  classLabel?: string | null;
  teacherLabel?: string | null;
  schoolId?: string | null;
};

export type TimetableChangeRequestResponse = {
  id: string;
  schoolId: string;
  academicYearId: string;
  sourceTimetableId: string;
  sourceRevision: number;
  sourceEntryId: string | null;
  sourceClassId: string;
  sourceDay: DayOfWeek;
  sourceSlotKey: string;
  sourceOptionCode: string;
  changeKind: TimetableChangeKind;
  currentSnapshot: TimetableEntrySnapshotDto | null;
  proposed: TimetableEntrySnapshotDto;
  classLabel: string | null;
  teacherId: string;
  teacherLabel: string | null;
  reason: string;
  status: TimetableChangeStatus;
  requestedBy: string;
  requestedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  appliedTimetableId: string | null;
  appliedEntryId: string | null;
};

export async function createTimetableChangeRequest(
  payload: CreateTimetableChangeRequest,
): Promise<TimetableChangeRequestResponse> {
  return apiRequest<TimetableChangeRequestResponse>("/api/v1/timetable-change-requests", {
    method: "POST",
    body: payload,
  });
}

export async function listPendingTimetableChanges(
  schoolId?: string | null,
): Promise<TimetableChangeRequestResponse[]> {
  const qs = toSearch(schoolParams(schoolId));
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<TimetableChangeRequestResponse[]>(
    `/api/v1/timetable-change-requests/pending${suffix}`,
  );
}

export async function listMyTimetableChanges(
  schoolId?: string | null,
): Promise<TimetableChangeRequestResponse[]> {
  const qs = toSearch(schoolParams(schoolId));
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<TimetableChangeRequestResponse[]>(
    `/api/v1/timetable-change-requests/mine${suffix}`,
  );
}

export async function approveTimetableChange(
  id: string,
  schoolId?: string | null,
): Promise<TimetableChangeRequestResponse> {
  const qs = toSearch(schoolParams(schoolId));
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<TimetableChangeRequestResponse>(
    `/api/v1/timetable-change-requests/${encodeURIComponent(id)}/approve${suffix}`,
    { method: "POST" },
  );
}

export async function rejectTimetableChange(
  id: string,
  reviewNote: string,
  schoolId?: string | null,
): Promise<TimetableChangeRequestResponse> {
  return apiRequest<TimetableChangeRequestResponse>(
    `/api/v1/timetable-change-requests/${encodeURIComponent(id)}/reject`,
    { method: "POST", body: { reviewNote, schoolId: schoolId ?? null } },
  );
}

export async function cancelTimetableChange(
  id: string,
  schoolId?: string | null,
): Promise<TimetableChangeRequestResponse> {
  const qs = toSearch(schoolParams(schoolId));
  const suffix = qs ? `?${qs}` : "";
  return apiRequest<TimetableChangeRequestResponse>(
    `/api/v1/timetable-change-requests/${encodeURIComponent(id)}/cancel${suffix}`,
    { method: "POST" },
  );
}

/** PDF A4 paysage d’une classe (blob). */
export async function downloadTimetableClassPdf(
  timetableId: string,
  classId: string,
  options: { schoolId?: string | null; language?: "FR" | "EN" } = {},
): Promise<Blob> {
  const baseUrl = getTenantConfig().apiBaseUrl.replace(/\/$/, "") || "http://localhost:8090";
  const token = openSecret(useAuthStore.getState().accessToken);
  const qs = toSearch({
    classId,
    language: options.language ?? null,
    ...schoolParams(options.schoolId),
  });
  const response = await fetch(
    `${baseUrl}/api/v1/timetables/${encodeURIComponent(timetableId)}/pdf?${qs}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
  );
  if (!response.ok) {
    throw new Error(`PDF ${response.status}`);
  }
  return response.blob();
}
