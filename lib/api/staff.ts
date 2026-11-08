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

export type UpdateStaffIdentityRequest = {
  lastName: string;
  firstName?: string;
  civility?: StaffResponse["civility"];
  contact?: Partial<StaffContactDto>;
};

export async function getStaff(id: string, schoolId?: string | null): Promise<StaffResponse> {
  const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : "";
  return apiRequest<StaffResponse>(`/api/v1/staff/${encodeURIComponent(id)}${query}`);
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
