import { apiRequest } from "./client";
import type { LoginRequest, LoginResponse } from "@/types/auth";

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
  });
}
