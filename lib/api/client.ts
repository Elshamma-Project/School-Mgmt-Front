import { ApiError, type ProblemDetails } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";

const DEFAULT_BASE_URL = "http://localhost:8090";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL;
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
};

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

/**
 * Client HTTP minimal vers l’API SMELS.
 * Ne journalise jamais d’identifiants élèves côté client.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);

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
    response = await fetch(`${getBaseUrl()}${path}`, {
      ...rest,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network");
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
