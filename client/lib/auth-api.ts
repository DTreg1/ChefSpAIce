import { getApiUrl } from "@/lib/query-client";
import { logger } from "@/lib/logger";
import { isWeb, isIOS, isAndroid } from "@/lib/auth-storage";
import type { AuthResponseData, ApiResponseBody } from "@/lib/types";

let AppleAuthentication: typeof import("expo-apple-authentication") | null =
  null;
let Google: typeof import("expo-auth-session/providers/google") | null = null;
let WebBrowser: typeof import("expo-web-browser") | null = null;
let AuthSession: typeof import("expo-auth-session") | null = null;

if (isIOS) {
  AppleAuthentication = require("expo-apple-authentication");
}

if (!isWeb) {
  Google = require("expo-auth-session/providers/google");
  WebBrowser = require("expo-web-browser");
  WebBrowser?.maybeCompleteAuthSession();
  AuthSession = require("expo-auth-session");
}

export { AppleAuthentication, AuthSession };

const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const APPLE_CLIENT_ID = process.env.EXPO_PUBLIC_APPLE_CLIENT_ID;

const appleDiscovery = {
  authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
  tokenEndpoint: 'https://appleid.apple.com/auth/token',
};

export type AuthResult =
  | { success: true; data: AuthResponseData }
  | { success: false; error: string };

export function useGoogleAuth() {
  if (isWeb || !Google || (!GOOGLE_ANDROID_CLIENT_ID && !GOOGLE_IOS_CLIENT_ID)) {
    return [null, null, null] as const;
  }

  return Google.useIdTokenAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
}

export function useAppleWebAuth() {
  if (isWeb || !AuthSession || !APPLE_CLIENT_ID) {
    return [null, null, null] as const;
  }

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'com.chefspaice.chefspaice',
  });

  return AuthSession.useAuthRequest(
    {
      clientId: APPLE_CLIENT_ID,
      scopes: ['name', 'email'],
      responseType: 'code' as AuthSession.ResponseType,
      redirectUri,
    },
    appleDiscovery
  );
}

export async function loginApi(
  email: string,
  password: string,
): Promise<AuthResult> {
  const baseUrl = getApiUrl();
  const url = new URL("/api/auth/login", baseUrl);

  const response = await fetch(url.toString(), {
    method: "POST",
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
  const baseUrl = getApiUrl();
  logger.log("[SignUp] API URL:", baseUrl);
  const url = new URL("/api/auth/register", baseUrl);
  logger.log("[SignUp] Full URL:", url.toString());

  const response = await fetch(url.toString(), {
    method: "POST",
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

interface AppleAuthPayload {
  identityToken: string | null;
  authorizationCode: string | null;
  selectedTier?: "pro";
  user: {
    email: string | null;
  };
}

export async function appleSignInApi(
  promptAppleWebAsync: (() => Promise<any>) | null,
  selectedTier?: "pro",
): Promise<AuthResult> {
  try {
    if (isWeb) {
      return {
        success: false,
        error: "Apple Sign-In is not available on web",
      };
    }

    let response: Response;
    let data: {
      error?: string;
      user?: {
        id: string;
        email: string;
        displayName?: string;
        avatarUrl?: string;
        provider?: string;
        isNewUser?: boolean;
        createdAt: string;
      };
      token?: string;
    };

    if (isIOS && AppleAuthentication) {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });

      const authPayload: AppleAuthPayload = {
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        selectedTier,
        user: {
          email: credential.email,
        },
      };

      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/social/apple", baseUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        response = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(authPayload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const _body: ApiResponseBody<AuthResponseData> = await response.json();
        data = response.ok ? _body.data : _body;
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        const fetchErr = fetchError as { name?: string; message?: string };
        if (fetchErr.name === "AbortError") {
          logger.error("Apple auth request timed out");
          return {
            success: false,
            error:
              "Request timed out. Please check your connection and try again.",
          };
        }
        logger.error("Apple auth fetch error:", fetchError);
        return {
          success: false,
          error:
            "Unable to connect to server. Please check your internet connection.",
        };
      }
    } else if (isAndroid) {
      if (!promptAppleWebAsync) {
        return { success: false, error: "Apple Sign-In not available" };
      }
      const result = await promptAppleWebAsync();
      if (result.type !== 'success') {
        return { success: false, error: "Apple sign in cancelled" };
      }
      const authorizationCode = result.params?.code;
      if (!authorizationCode) {
        return { success: false, error: "No authorization code received from Apple" };
      }

      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/social/apple", baseUrl);
      const redirectUri = AuthSession?.makeRedirectUri({ scheme: 'com.chefspaice.chefspaice' }) || '';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        response = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            authorizationCode,
            isWebAuth: true,
            redirectUri,
            selectedTier,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const _body: ApiResponseBody<AuthResponseData> = await response.json();
        data = response.ok ? _body.data : _body;
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        const fetchErr = fetchError as { name?: string; message?: string };
        if (fetchErr.name === "AbortError") {
          logger.error("Apple auth request timed out");
          return {
            success: false,
            error:
              "Request timed out. Please check your connection and try again.",
          };
        }
        logger.error("Apple auth fetch error:", fetchError);
        return {
          success: false,
          error:
            "Unable to connect to server. Please check your internet connection.",
        };
      }
    } else {
      return {
        success: false,
        error: "Apple Sign-In is not available on this platform",
      };
    }

    if (!response!.ok) {
      logger.error("Apple auth server error:", response!.status, data!);
      return {
        success: false,
        error: data!.error || "Apple sign in failed. Please try again.",
      };
    }

    if (!data!.user || !data!.user.id || !data!.token) {
      logger.error(
        "Apple auth: Invalid server response - missing user or token",
      );
      return {
        success: false,
        error: "Invalid server response. Please try again.",
      };
    }

    return {
      success: true,
      data: {
        user: data!.user as AuthResponseData["user"],
        token: data!.token!,
      },
    };
  } catch (error: unknown) {
    const errorWithCode = error as { code?: string; message?: string };
    logger.error("Apple sign in error:", error);

    switch (errorWithCode.code) {
      case "ERR_CANCELED":
      case "ERR_REQUEST_CANCELED":
        return { success: false, error: "User cancelled" };
      case "ERR_INVALID_RESPONSE":
        return {
          success: false,
          error: "Invalid response from Apple. Please try again.",
        };
      case "ERR_REQUEST_NOT_HANDLED":
        return {
          success: false,
          error:
            "Sign-in request was not handled. Please check your device settings.",
        };
      case "ERR_NOT_AVAILABLE":
      case "ERR_MISSING_SCOPE":
        return {
          success: false,
          error:
            "Apple Sign-In is not properly configured. Please check device settings.",
        };
      case "ERR_NETWORK":
        return {
          success: false,
          error:
            "Network error. Please check your connection and try again.",
        };
      case "ERR_UNKNOWN":
      default:
        const errorMessage =
          errorWithCode.message || "Apple sign in failed";
        return {
          success: false,
          error: `Unable to complete sign in: ${errorMessage}. Please ensure you're signed into iCloud with an Apple ID.`,
        };
    }
  }
}

export async function googleSignInApi(
  promptGoogleAsync: (() => Promise<any>) | null,
  selectedTier?: "pro",
): Promise<AuthResult> {
  try {
    if (!promptGoogleAsync) {
      return { success: false, error: "Google sign in not available" };
    }

    const result = await promptGoogleAsync();

    if (result.type !== "success") {
      return { success: false, error: "Google sign in cancelled" };
    }

    const idToken =
      result.params?.id_token || result.authentication?.idToken;
    const accessToken = result.authentication?.accessToken;

    if (!idToken) {
      logger.error("Google sign in: no id_token received", result);
      return { success: false, error: "No ID token received from Google" };
    }

    const baseUrl = getApiUrl();
    const url = new URL("/api/auth/social/google", baseUrl);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        idToken,
        accessToken,
        selectedTier,
      }),
    });

    const body: ApiResponseBody<AuthResponseData> = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: body.error || "Google sign in failed",
      };
    }

    const data = body.data as AuthResponseData;

    if (!data.user || !data.user.id || !data.token) {
      logger.error(
        "Google auth: Invalid server response - missing user or token",
      );
      return {
        success: false,
        error: "Invalid server response. Please try again.",
      };
    }

    return { success: true, data };
  } catch (error) {
    logger.error("Google sign in error:", error);
    return { success: false, error: "Google sign in failed" };
  }
}
