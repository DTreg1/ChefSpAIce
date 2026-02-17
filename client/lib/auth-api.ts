import { apiClient } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import type { AuthResponseData, ApiResponseBody } from "@/lib/types";

export type AuthResult =
  | { success: true; data: AuthResponseData }
  | { success: false; error: string };

export async function loginApi(
  email: string,
  password: string,
): Promise<AuthResult> {
  const response = await apiClient.raw("POST", "/api/auth/login", {
    skipAuth: true,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const body: ApiResponseBody<AuthResponseData> = await response.json();

  if (!response.ok) {
    return { success: false, error: body.error || "Sign in failed" };
  }

  const data = body.data as AuthResponseData;

  if (!data.user || !data.user.id || !data.token) {
    logger.error("Login: Invalid server response - missing user or token");
    return {
      success: false,
      error: "Invalid server response. Please try again.",
    };
  }

  return { success: true, data };
}

export async function registerApi(
  email: string,
  password: string,
  displayName?: string,
  selectedTier?: "pro",
): Promise<AuthResult> {
  logger.log("[SignUp] Starting registration...", {
    email,
    selectedTier,
  });

  const response = await apiClient.raw("POST", "/api/auth/register", {
    skipAuth: true,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email,
      password,
      displayName,
      selectedPlan: "monthly",
    }),
  });
  logger.log("[SignUp] Response status:", response.status);

  const body: ApiResponseBody<AuthResponseData> = await response.json();
  logger.log("[SignUp] Response data:", body);

  if (!response.ok) {
    return { success: false, error: body.error || "Registration failed" };
  }

  const data = body.data as AuthResponseData;

  if (!data.user || !data.user.id || !data.token) {
    logger.error(
      "SignUp: Invalid server response - missing user or token",
    );
    return {
      success: false,
      error: "Invalid server response. Please try again.",
    };
  }

  return { success: true, data };
}
