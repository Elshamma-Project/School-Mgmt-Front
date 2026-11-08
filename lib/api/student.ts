import { apiRequest } from "./client";

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type StudentContactDto = {
  phones: string[];
  email: string | null;
  address: string | null;
  city: string | null;
};

export type StudentResponse = {
  id: string;
  schoolId: string;
  matricule: string;
  lastName: string;
  firstName: string;
  fullName: string;
  sex: "M" | "F" | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  nationality: string | null;
  photoFileId: string | null;
  contact: StudentContactDto;
  guardians: unknown[];
  active: boolean;
};

export type EnrollmentResponse = {
  id: string;
  schoolId: string;
  academicYearId: string;
  studentId: string;
  classId: string;
  levelId: string;
  rollNumber: number | null;
  repeater: boolean;
  newStudent: boolean;
  status: string;
  enrolledOn: string | null;
  leftOn: string | null;
  previousSchool: string | null;
};

function schoolParams(schoolId?: string | null): Record<string, string> {
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

export async function listStudents(options: {
  page?: number;
  size?: number;
  active?: boolean | null;
  q?: string | null;
  schoolId?: string | null;
} = {}): Promise<PageResponse<StudentResponse>> {
  const qs = toSearch({
    page: options.page ?? 0,
    size: options.size ?? 100,
    active: options.active ?? null,
    q: options.q?.trim() || null,
    ...schoolParams(options.schoolId),
  });
  return apiRequest<PageResponse<StudentResponse>>(`/api/v1/students?${qs}`);
}

export async function listEnrollments(options: {
  page?: number;
  size?: number;
  academicYearId?: string | null;
  classId?: string | null;
  status?: string | null;
  schoolId?: string | null;
} = {}): Promise<PageResponse<EnrollmentResponse>> {
  const qs = toSearch({
    page: options.page ?? 0,
    size: options.size ?? 100,
    academicYearId: options.academicYearId ?? null,
    classId: options.classId ?? null,
    status: options.status ?? null,
    ...schoolParams(options.schoolId),
  });
  return apiRequest<PageResponse<EnrollmentResponse>>(`/api/v1/enrollments?${qs}`);
}
