import { apiRequest } from "./client";
import {
  mapUserAccountDto,
  type AuthTokensResponse,
  type ChangePasswordRequest,
  type LoginRequest,
  type LoginResponse,
  type UserAccountDto,
} from "@/types/auth";

function toLoginResponse(raw: AuthTokensResponse): LoginResponse {
  return {
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
    sessionId: raw.sessionId,
    expiresInMs: raw.expiresInMs,
    mustChangePassword: raw.mustChangePassword,
    user: mapUserAccountDto(raw.user),
  };
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const body: Record<string, string> = {
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
  };
  const schoolId = payload.schoolId?.trim();
  if (schoolId) body.schoolId = schoolId;
  if (payload.deviceLabel?.trim()) body.deviceLabel = payload.deviceLabel.trim();

  const raw = await apiRequest<AuthTokensResponse>("/api/v1/auth/login", {
    method: "POST",
    body,
    auth: false,
    skipRefresh: true,
  });
  return toLoginResponse(raw);
}

export async function refresh(refreshToken: string): Promise<LoginResponse> {
  const raw = await apiRequest<AuthTokensResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    auth: false,
    skipRefresh: true,
  });
  return toLoginResponse(raw);
}

export async function logout(): Promise<void> {
  await apiRequest<void>("/api/v1/auth/logout", {
    method: "POST",
    skipRefresh: true,
  });
}

export async function logoutAll(): Promise<{ revokedSessions: number }> {
  return apiRequest<{ revokedSessions: number }>("/api/v1/auth/logout-all", {
    method: "POST",
  });
}

export async function fetchMe(): Promise<UserAccountDto> {
  return apiRequest<UserAccountDto>("/api/v1/auth/me");
}

export async function changePassword(payload: ChangePasswordRequest): Promise<UserAccountDto> {
  return apiRequest<UserAccountDto>("/api/v1/auth/change-password", {
    method: "POST",
    body: payload,
  });
}

export async function uploadAvatar(file: File): Promise<UserAccountDto> {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<UserAccountDto>("/api/v1/auth/me/avatar", {
    method: "PUT",
    body: form,
  });
}

export async function fetchAvatarBlob(): Promise<Blob | null> {
  const { getTenantConfig } = await import("@/lib/tenant/config");
  const { useAuthStore } = await import("@/stores/auth-store");
  const baseUrl = getTenantConfig().apiBaseUrl.replace(/\/$/, "") || "http://localhost:8090";
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;
  try {
    const response = await fetch(`${baseUrl}/api/v1/auth/me/avatar`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 404) return null;
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

export async function deleteAvatar(): Promise<void> {
  await apiRequest<void>("/api/v1/auth/me/avatar", {
    method: "DELETE",
  });
}
