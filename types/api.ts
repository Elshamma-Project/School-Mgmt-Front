/** RFC 7807 Problem Details — format Spring/Kotlin typique. */
export type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | null;

  constructor(status: number, message: string, problem: ProblemDetails | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }

  get code(): string | null {
    const fromProblem =
      (typeof this.problem?.code === "string" && this.problem.code) ||
      (typeof this.problem?.title === "string" && this.problem.title) ||
      null;
    return fromProblem;
  }
}

/** 401 / session morte — ne pas toaster : le guard redirige vers /login. */
export function isAuthFailure(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status !== 401 && error.status !== 403) return false;
  const code = (error.code ?? "").toUpperCase();
  if (
    code === "UNAUTHORIZED" ||
    code === "INVALID_TOKEN" ||
    code === "SESSION_EXPIRED" ||
    code === "SESSION_INVALID" ||
    code === "SESSION_REVOKED" ||
    code === "INVALID_REFRESH" ||
    code === "PASSWORD_CHANGE_REQUIRED"
  ) {
    return true;
  }
  const msg = error.message.toLowerCase();
  return (
    msg.includes("authentication required") ||
    msg.includes("access token") ||
    msg.includes("session has expired") ||
    msg.includes("session is not active")
  );
}
