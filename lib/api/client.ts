import { ApiError, type ProblemDetails } from "@/types/api";
import { getTenantConfig } from "@/lib/tenant/config";
import { useAuthStore } from "@/stores/auth-store";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  /** Évite une boucle infinie lors du refresh. */
  skipRefresh?: boolean;
  /** Réponse binaire (avatar). */
  responseType?: "json" | "blob" | "void";
};

let refreshInFlight: Promise<boolean> | null = null;
const REFRESH_LOCK = "smels-auth-refresh";

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

async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const locks = nav && "locks" in nav ? nav.locks : undefined;
  if (!locks?.request) {
    return fn();
  }
  return locks.request(REFRESH_LOCK, { mode: "exclusive" }, () => fn());
}

async function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = withRefreshLock(async () => {
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
    }
  }).finally(() => {
    refreshInFlight = null;
  });

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
  const {
    body,
    auth = true,
    headers,
    skipRefresh = false,
    responseType = "json",
    ...rest
  } = options;
  const requestHeaders = new Headers(headers);
  const baseUrl = getTenantConfig().apiBaseUrl.replace(/\/$/, "") || "http://localhost:8090";

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData && !requestHeaders.has("Content-Type")) {
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
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
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

  if (response.status === 204 || responseType === "void") {
    if (!response.ok && response.status !== 204) {
      const problem = await parseProblem(response);
      throw new ApiError(
        response.status,
        (typeof problem?.detail === "string" && problem.detail) || `HTTP ${response.status}`,
        problem,
      );
    }
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

  if (responseType === "blob") {
    return (await response.blob()) as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text.trim()) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(response.status, "invalid_json");
  }
}
