import { apiRequest } from "./client";

export type StaffContactDto = {
  phones: string[];
  email: string | null;
  address: string | null;
  city: string | null;
};

export type StaffResponse = {
  id: string;
  schoolId: string;
  staffNumber: string | null;
  lastName: string;
  firstName: string;
  fullName: string;
  civility: "MR" | "MME" | "MLLE" | "DR" | "PR" | null;
  sex: "M" | "F" | null;
  dateOfBirth: string | null;
  contact: StaffContactDto;
  functions: string[];
  employmentStatus: string | null;
  teachableSubjectIds: string[];
  hireDate: string | null;
  active: boolean;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ListStaffParams = {
  page?: number;
  size?: number;
  active?: boolean | null;
  function?: string | null;
  q?: string | null;
  schoolId?: string | null;
};

export type CreateStaffRequest = {
  lastName: string;
  firstName?: string;
  staffNumber?: string | null;
  civility?: StaffResponse["civility"];
  sex?: StaffResponse["sex"];
  contact?: Partial<StaffContactDto>;
  functions?: string[];
  employmentStatus?: string | null;
  schoolId?: string | null;
};

export type UpdateStaffIdentityRequest = {
  lastName: string;
  firstName?: string;
  civility?: StaffResponse["civility"];
  contact?: Partial<StaffContactDto>;
};

function schoolQuery(schoolId?: string | null): string {
  return schoolId ? `schoolId=${encodeURIComponent(schoolId)}` : "";
}

export async function listStaff(params: ListStaffParams = {}): Promise<PageResponse<StaffResponse>> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 0));
  search.set("size", String(params.size ?? 50));
  if (params.active !== undefined && params.active !== null) {
    search.set("active", String(params.active));
  }
  if (params.function) search.set("function", params.function);
  if (params.q?.trim()) search.set("q", params.q.trim());
  const school = schoolQuery(params.schoolId);
  if (school) search.set("schoolId", params.schoolId!.trim());

  return apiRequest<PageResponse<StaffResponse>>(`/api/v1/staff?${search.toString()}`);
}

export async function getStaff(id: string, schoolId?: string | null): Promise<StaffResponse> {
  const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : "";
  return apiRequest<StaffResponse>(`/api/v1/staff/${encodeURIComponent(id)}${query}`);
}

export async function createStaff(payload: CreateStaffRequest): Promise<StaffResponse> {
  return apiRequest<StaffResponse>("/api/v1/staff", {
    method: "POST",
    body: {
      lastName: payload.lastName.trim(),
      firstName: (payload.firstName ?? "").trim(),
      staffNumber: payload.staffNumber?.trim() || null,
      civility: payload.civility ?? null,
      sex: payload.sex ?? null,
      contact: {
        phones: payload.contact?.phones ?? [],
        email: payload.contact?.email?.trim() || null,
        address: payload.contact?.address?.trim() || null,
        city: payload.contact?.city?.trim() || null,
      },
      functions: payload.functions?.length ? payload.functions : ["TEACHER"],
      employmentStatus: payload.employmentStatus ?? null,
      schoolId: payload.schoolId ?? null,
    },
  });
}

export async function updateStaffIdentity(
  id: string,
  payload: UpdateStaffIdentityRequest,
  schoolId?: string | null,
): Promise<StaffResponse> {
  const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : "";
  return apiRequest<StaffResponse>(`/api/v1/staff/${encodeURIComponent(id)}/identity${query}`, {
    method: "PUT",
    body: {
      lastName: payload.lastName.trim(),
      firstName: (payload.firstName ?? "").trim(),
      civility: payload.civility ?? null,
      contact: {
        phones: payload.contact?.phones ?? [],
        email: payload.contact?.email?.trim() || null,
        address: payload.contact?.address?.trim() || null,
        city: payload.contact?.city?.trim() || null,
      },
    },
  });
}

export async function deactivateStaff(id: string, schoolId?: string | null): Promise<StaffResponse> {
  const qs = schoolQuery(schoolId);
  const query = qs ? `?${qs}` : "";
  return apiRequest<StaffResponse>(
    `/api/v1/staff/${encodeURIComponent(id)}/deactivate${query}`,
    { method: "POST" },
  );
}

export async function reactivateStaff(id: string, schoolId?: string | null): Promise<StaffResponse> {
  const qs = schoolQuery(schoolId);
  const query = qs ? `?${qs}` : "";
  return apiRequest<StaffResponse>(
    `/api/v1/staff/${encodeURIComponent(id)}/reactivate${query}`,
    { method: "POST" },
  );
}
