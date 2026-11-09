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
  /** Compte lié (user) — null si aucun compte ou jamais connecté. */
  lastLoginAt: string | null;
  /** True si un UserAccount STAFF est lié. */
  hasLoginAccount?: boolean;
  /** Identifiant de connexion (e-mail) du compte lié. */
  loginUsername?: string | null;
  /**
   * Mot de passe temporaire — uniquement juste après création avec compte.
   * Jamais renvoyé ensuite.
   */
  temporaryPassword?: string | null;
  /** Droit de gestion pour l’appelant (modifier / désactiver). */
  canManage?: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
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
  /** Défaut true côté API : provisionne un UserAccount (e-mail obligatoire). */
  createLoginAccount?: boolean;
};

export type UpdateStaffIdentityRequest = {
  lastName: string;
  firstName?: string;
  civility?: StaffResponse["civility"];
  contact?: Partial<StaffContactDto>;
};

/** Mise à jour RH complète (identité + matricule + contact ; fonctions préservées côté appelant). */
export type UpdateStaffRequest = {
  lastName: string;
  firstName?: string;
  staffNumber?: string | null;
  civility?: StaffResponse["civility"];
  sex?: StaffResponse["sex"];
  contact?: Partial<StaffContactDto>;
  functions?: string[];
  employmentStatus?: string | null;
  teachableSubjectIds?: string[];
  hireDate?: string | null;
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
      createLoginAccount: payload.createLoginAccount ?? true,
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

export async function updateStaff(
  id: string,
  payload: UpdateStaffRequest,
  schoolId?: string | null,
): Promise<StaffResponse> {
  const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : "";
  return apiRequest<StaffResponse>(`/api/v1/staff/${encodeURIComponent(id)}${query}`, {
    method: "PUT",
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
      teachableSubjectIds: payload.teachableSubjectIds ?? [],
      hireDate: payload.hireDate ?? null,
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
