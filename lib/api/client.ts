import { ApiError, type ProblemDetails } from "@/types/api";
import { getTenantConfig } from "@/lib/tenant/config";
import { openSecret } from "@/lib/auth/token-vault";
import { useAuthStore } from "@/stores/auth-store";

/** Délai max par défaut : évite un overlay « Ouverture de la session » bloqué si l’API est down. */
export const API_DEFAULT_TIMEOUT_MS = 12_000;

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
  /** Timeout ms (AbortSignal). Défaut [API_DEFAULT_TIMEOUT_MS]. `0` = pas de timeout. */
  timeoutMs?: number;
};

function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function mergeAbortSignals(
  existing: AbortSignal | null | undefined,
  timeoutMs: number,
): AbortSignal | undefined {
  if (timeoutMs <= 0) return existing ?? undefined;
  const timeout = createTimeoutSignal(timeoutMs);
  if (!existing) return timeout;
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function") {
    return AbortSignal.any([existing, timeout]);
  }
  return timeout;
}

type RefreshOutcome = "ok" | "auth_failed" | "transient_failed" | "unavailable";

let refreshInFlight: Promise<RefreshOutcome> | null = null;
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

/**
 * Renouvelle l’access token.
 * - `ok` : jetons mis à jour
 * - `auth_failed` : refresh rejeté (401/400/403) → session nettoyée si demandé
 * - `transient_failed` : réseau / 5xx → **ne pas** déconnecter (retry possible)
 * - `unavailable` : pas de refresh token / mock
 */
async function tryRefreshAccessToken(clearOnFailure: boolean): Promise<RefreshOutcome> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = withRefreshLock(async (): Promise<RefreshOutcome> => {
    const { refreshToken, isMock, applyTokens, clearSession } = useAuthStore.getState();
    const openedRefresh = resolveToken(refreshToken);

    if (isMock || !openedRefresh) {
      if (clearOnFailure) clearSession();
      return "unavailable";
    }

    try {
      const { refresh } = await import("@/lib/api/auth");
      const tokens = await refresh(openedRefresh);
      applyTokens(tokens);
      return "ok";
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      if (status === 401 || status === 400 || status === 403) {
        if (clearOnFailure) clearSession();
        return "auth_failed";
      }
      // 5xx / réseau / optimistic lock résiduel : garder la session pour un prochain essai.
      return "transient_failed";
    }
  }).finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

function throwHttpError(status: number, problem: ProblemDetails | null): never {
  const message =
    (typeof problem?.detail === "string" && problem.detail) ||
    (typeof problem?.title === "string" && problem.title) ||
    `HTTP ${status}`;
  throw new ApiError(status, message, problem);
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
    timeoutMs = API_DEFAULT_TIMEOUT_MS,
    signal: userSignal,
    ...rest
  } = options;
  const requestHeaders = new Headers(headers);
  const baseUrl = getTenantConfig().apiBaseUrl.replace(/\/$/, "") || "http://localhost:8090";
  const signal = mergeAbortSignals(userSignal, timeoutMs);

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    let token = resolveToken(useAuthStore.getState().accessToken);
    // Access absent mais refresh présent → renouveler avant d’appeler (évite toast « Authentication required »).
    if (!token && !skipRefresh) {
      const outcome = await tryRefreshAccessToken(clearSessionOnFailure);
      if (outcome === "ok") {
        token = resolveToken(useAuthStore.getState().accessToken);
      } else if (outcome === "transient_failed") {
        throw new ApiError(503, "auth_refresh_unavailable");
      }
    }
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...rest,
      signal,
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
    const outcome = await tryRefreshAccessToken(clearSessionOnFailure);
    if (outcome === "ok") {
      return apiRequest<T>(path, { ...options, skipRefresh: true });
    }
    // Déconnexion uniquement si le refresh est définitivement rejeté (ou absent).
    // Un 5xx / optimistic lock ne doit pas éjecter l’utilisateur.
    if (outcome === "transient_failed") {
      throw new ApiError(503, "auth_refresh_unavailable");
    }
    if (clearSessionOnFailure && outcome !== "auth_failed") {
      // auth_failed a déjà clearSession dans tryRefreshAccessToken
      useAuthStore.getState().clearSession();
    }
    const problem = await parseProblem(response);
    throwHttpError(401, problem ?? { title: "UNAUTHORIZED", detail: "Authentication required", status: 401 });
  }

  if (response.status === 204 || responseType === "void") {
    if (!response.ok && response.status !== 204) {
      const problem = await parseProblem(response);
      throwHttpError(response.status, problem);
    }
    return undefined as T;
  }

  if (!response.ok) {
    const problem = await parseProblem(response);
    throwHttpError(response.status, problem);
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
