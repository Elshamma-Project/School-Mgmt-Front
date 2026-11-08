import { ApiError, type ProblemDetails } from "@/types/api";
import { getTenantConfig } from "@/lib/tenant/config";
import { useAuthStore } from "@/stores/auth-store";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  /** Évite une boucle infinie lors du refresh. */
  skipRefresh?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

async function parseProblem(response: Response): Promise<ProblemDetails | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/problem+json") && !contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    return null;
  }
}

async function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const { refreshToken, isMock, applyTokens, clearSession } = useAuthStore.getState();
    if (isMock || !refreshToken) {
      clearSession();
      return false;
    }

    try {
      const { refresh } = await import("@/lib/api/auth");
      const tokens = await refresh(refreshToken);
      applyTokens(tokens);
      return true;
    } catch {
      clearSession();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Client HTTP vers l’API SMELS.
 * Ne journalise jamais d’identifiants élèves côté client.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, headers, skipRefresh = false, ...rest } = options;
  const requestHeaders = new Headers(headers);
  // Accès statique NEXT_PUBLIC_* via getTenantConfig (inliné au build / dev).
  const baseUrl = getTenantConfig().apiBaseUrl.replace(/\/$/, "") || "http://localhost:8090";

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...rest,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network");
  }

  if (response.status === 401 && auth && !skipRefresh) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const problem = await parseProblem(response);
    const message =
      (typeof problem?.detail === "string" && problem.detail) ||
      (typeof problem?.title === "string" && problem.title) ||
      `HTTP ${response.status}`;
    throw new ApiError(response.status, message, problem);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
