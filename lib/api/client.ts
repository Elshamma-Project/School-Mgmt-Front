import { ApiError, type ProblemDetails } from "@/types/api";
import { getTenantConfig } from "@/lib/tenant/config";
import { openSecret } from "@/lib/auth/token-vault";
import { useAuthStore } from "@/stores/auth-store";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
  /** Évite une boucle infinie lors du refresh. */
  skipRefresh?: boolean;
  /**
   * Si false : un 401 / refresh raté ne déconnecte pas (ex. avatar optionnel).
   * Défaut true pour les appels métier.
   */
  clearSessionOnFailure?: boolean;
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

function resolveToken(raw: string | null | undefined): string | null {
  return openSecret(raw);
}

async function tryRefreshAccessToken(clearOnFailure: boolean): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = withRefreshLock(async () => {
    const { refreshToken, isMock, applyTokens, clearSession } = useAuthStore.getState();
    const openedRefresh = resolveToken(refreshToken);

    if (isMock || !openedRefresh) {
      if (clearOnFailure) clearSession();
      return false;
    }

    try {
      const { refresh } = await import("@/lib/api/auth");
      const tokens = await refresh(openedRefresh);
      applyTokens(tokens);
      return true;
    } catch (error) {
      // Réseau / 5xx : ne pas jeter la session. Auth définitive (401/400) : oui.
      const status = error instanceof ApiError ? error.status : 0;
      if (clearOnFailure && (status === 401 || status === 400 || status === 403)) {
        clearSession();
      }
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
    clearSessionOnFailure = true,
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
    const token = resolveToken(useAuthStore.getState().accessToken);
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
    const refreshed = await tryRefreshAccessToken(clearSessionOnFailure);
    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipRefresh: true });
    }
    if (clearSessionOnFailure && useAuthStore.getState().accessToken) {
      // Refresh raté pour cause auth : session déjà nettoyée dans tryRefresh si 401.
      // Si refresh a échoué sans clear (réseau), on laisse la session.
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
