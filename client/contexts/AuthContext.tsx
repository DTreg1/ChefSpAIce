/**
 * =============================================================================
 * AUTHENTICATION CONTEXT
 * =============================================================================
 *
 * Manages user authentication state throughout the ChefSpAIce app.
 * Provides login, registration, and social auth capabilities.
 *
 * AUTHENTICATION METHODS:
 * - Email/Password: Traditional credentials-based auth
 * - Apple Sign-In: Native iOS authentication (iOS only)
 * - Google Sign-In: OAuth-based auth (Android only)
 *
 * STATE MANAGEMENT:
 * - Stores auth token and user info in AsyncStorage
 * - Automatically loads stored auth on app launch
 * - Syncs with server to validate token freshness
 * - Auto-syncs user data from cloud after login
 *
 * SECURITY:
 * - Handles 401 errors by auto-logging out
 * - Clears all local data on sign out
 * - Secure token storage
 *
 * PLATFORM HANDLING:
 * - iOS: Apple Sign-In available
 * - Android: Google Sign-In available
 * - Web: Email/password only
 *
 * INTEGRATION:
 * - Works with SubscriptionContext for subscription management
 * - Triggers cloud sync on authentication
 * - Updates navigation state on auth changes
 *
 * @module contexts/AuthContext
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getApiUrl,
  queryClient,
  setAuthErrorCallback,
  clearAuthErrorCallback,
} from "@/lib/query-client";
import { storage } from "@/lib/storage";
import { storeKitService } from "@/lib/storekit-service";
import { logger } from "@/lib/logger";

const isWeb = Platform.OS === "web";
const isIOS = Platform.OS === "ios";
const isAndroid = Platform.OS === "android";

let AppleAuthentication: typeof import("expo-apple-authentication") | null =
  null;
let Google: typeof import("expo-auth-session/providers/google") | null = null;
let WebBrowser: typeof import("expo-web-browser") | null = null;

// Load Apple auth on iOS only (native)
if (isIOS) {
  AppleAuthentication = require("expo-apple-authentication");
}

// Load Google auth on Android only (not web - requires OAuth console configuration)
if (isAndroid) {
  Google = require("expo-auth-session/providers/google");
  WebBrowser = require("expo-web-browser");
  WebBrowser?.maybeCompleteAuthSession();
}

const AUTH_STORAGE_KEY = "@chefspaice/auth";

interface AuthUser {
  id: string;
  displayName?: string;
  email: string;
  avatarUrl?: string;
  provider?: "password" | "apple" | "google";
  createdAt: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    selectedTier?: "basic" | "pro",
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithApple: (
    selectedTier?: "basic" | "pro",
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (
    selectedTier?: "basic" | "pro",
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  setSignOutCallback: (callback: () => void) => void;
  isAuthenticated: boolean;
  isAppleAuthAvailable: boolean;
  isGoogleAuthAvailable: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  isAppleAuthAvailable: false,
  isGoogleAuthAvailable: false,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signInWithApple: async () => ({ success: false }),
  signInWithGoogle: async () => ({ success: false }),
  signOut: async () => {},
  setSignOutCallback: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface StoredAuthData {
  user: AuthUser;
  token: string;
}

const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

function useGoogleAuth() {
  // Use Google auth on Android only (not web - requires OAuth console configuration)
  if (!isAndroid || !Google || !GOOGLE_ANDROID_CLIENT_ID) {
    return [null, null, null] as const;
  }

  // Use useIdTokenAuthRequest to get an ID token directly (needed for server verification)
  return Google.useIdTokenAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
  const signOutCallbackRef = useRef<(() => void) | null>(null);
  const signOutRef = useRef<(() => Promise<void>) | null>(null);

  const setSignOutCallback = useCallback((callback: () => void) => {
    signOutCallbackRef.current = callback;
  }, []);

  // Register auth error callback to handle 401 errors from API
  // Uses a ref to always access the latest signOut function
  useEffect(() => {
    setAuthErrorCallback(() => {
      // When a 401 error occurs, sign out the user
      if (signOutRef.current) {
        signOutRef.current();
      }
    });

    return () => {
      clearAuthErrorCallback();
    };
  }, []);

  const [_googleRequest, _googleResponse, promptGoogleAsync] = useGoogleAuth();
  void _googleRequest;
  void _googleResponse; // reserved for future use

  useEffect(() => {
    const checkAppleAuth = async () => {
      // Apple auth only available on iOS (native)
      if (isIOS && AppleAuthentication) {
        const available = await AppleAuthentication.isAvailableAsync();
        setIsAppleAuthAvailable(available);
      }
    };
    checkAppleAuth();
  }, []);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        // First try AsyncStorage (works on all platforms)
        const storedData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (storedData) {
          const { user, token }: StoredAuthData = JSON.parse(storedData);
          await storage.setAuthToken(token);

          // Set StoreKit auth token and user ID, sync any pending purchases
          storeKitService.setAuthToken(token);
          if (user?.id) {
            storeKitService
              .setUserId(String(user.id))
              .catch((err) =>
                console.warn("[Auth] Failed to set StoreKit user ID:", err),
              );
          }
          storeKitService
            .syncPendingPurchases()
            .catch((err) =>
              console.warn(
                "[Auth] Failed to sync pending purchases on restore:",
                err,
              ),
            );

          setState({
            user,
            token,
            isLoading: false,
          });

          // Automatically sync from cloud when app loads with stored auth
          storage
            .syncFromCloud()
            .then((result) => {
              if (result.success) {
                logger.log("[Auth] Auto-synced data from cloud on app load");
              }
            })
            .catch((err) => {
              console.error("[Auth] Failed to auto-sync from cloud:", err);
            });
          return;
        }

        // On web, try to restore session from cookie if no AsyncStorage data
        if (isWeb) {
          try {
            const baseUrl = getApiUrl();
            const url = new URL("/api/auth/restore-session", baseUrl);
            const response = await fetch(url.toString(), {
              method: "GET",
              credentials: "include", // Important: include cookies
            });

            if (response.ok) {
              const data = await response.json();
              const authData: StoredAuthData = {
                user: data.user,
                token: data.token,
              };

              // Store in AsyncStorage for consistency
              await AsyncStorage.setItem(
                AUTH_STORAGE_KEY,
                JSON.stringify(authData),
              );
              await storage.setAuthToken(data.token);

              // Set StoreKit auth token and user ID, sync any pending purchases
              storeKitService.setAuthToken(data.token);
              if (data.user?.id) {
                storeKitService
                  .setUserId(String(data.user.id))
                  .catch((err) =>
                    console.warn("[Auth] Failed to set StoreKit user ID:", err),
                  );
              }
              storeKitService
                .syncPendingPurchases()
                .catch((err) =>
                  console.warn(
                    "[Auth] Failed to sync pending purchases on cookie restore:",
                    err,
                  ),
                );

              setState({
                user: data.user,
                token: data.token,
                isLoading: false,
              });

              logger.log("[Auth] Restored session from cookie");

              // Sync from cloud
              storage
                .syncFromCloud()
                .then((result) => {
                  if (result.success) {
                    logger.log(
                      "[Auth] Auto-synced data from cloud after cookie restore",
                    );
                  }
                })
                .catch((err) => {
                  console.error("[Auth] Failed to auto-sync from cloud:", err);
                });
              return;
            }
          } catch (cookieError) {
            logger.log("[Auth] No cookie session to restore");
          }
        }

        setState({
          user: null,
          token: null,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error loading auth state:", error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };
    loadStoredAuth();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/login", baseUrl);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Sign in failed" };
      }

      // Validate required fields from server response
      if (!data.user || !data.user.id || !data.token) {
        console.error("Login: Invalid server response - missing user or token");
        return {
          success: false,
          error: "Invalid server response. Please try again.",
        };
      }

      const authData: StoredAuthData = {
        user: data.user,
        token: data.token,
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      await storage.setAuthToken(data.token);

      // Set StoreKit auth token, user ID, and sync any pending purchases
      storeKitService.setAuthToken(data.token);
      storeKitService
        .setUserId(String(data.user.id))
        .catch((err) => console.warn("Failed to set StoreKit user ID:", err));
      storeKitService
        .syncPendingPurchases()
        .catch((err) => console.warn("Failed to sync pending purchases:", err));

      setState({
        user: data.user,
        token: data.token,
        isLoading: false,
      });

      await storage.syncFromCloud();

      return { success: true };
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName?: string,
      selectedTier?: "basic" | "pro",
    ) => {
      try {
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
            selectedPlan:
              selectedTier === "basic"
                ? "monthly"
                : selectedTier === "pro"
                  ? "annual"
                  : "monthly",
          }),
        });
        logger.log("[SignUp] Response status:", response.status);

        const data = await response.json();
        logger.log("[SignUp] Response data:", data);

        if (!response.ok) {
          return { success: false, error: data.error || "Registration failed" };
        }

        // Validate required fields from server response
        if (!data.user || !data.user.id || !data.token) {
          console.error(
            "SignUp: Invalid server response - missing user or token",
          );
          return {
            success: false,
            error: "Invalid server response. Please try again.",
          };
        }

        const authData: StoredAuthData = {
          user: data.user,
          token: data.token,
        };

        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        await storage.setAuthToken(data.token);

        // Set StoreKit auth token, user ID, and sync any pending purchases
        storeKitService.setAuthToken(data.token);
        storeKitService
          .setUserId(String(data.user.id))
          .catch((err) => console.warn("Failed to set StoreKit user ID:", err));
        storeKitService
          .syncPendingPurchases()
          .catch((err) =>
            console.warn("Failed to sync pending purchases:", err),
          );

        // Reset onboarding status for new users to ensure they see onboarding
        // This prevents stale local data from previous sessions from affecting the new user
        await storage.resetOnboarding();

        setState({
          user: data.user,
          token: data.token,
          isLoading: false,
        });

        // Sync fresh state to cloud (with onboarding reset)
        // This ensures the clean onboarding status is saved server-side
        await storage.syncToCloud();

        return { success: true };
      } catch (error) {
        console.error("Sign up error:", error);
        return { success: false, error: "Network error. Please try again." };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      // Call logout endpoint to clear cookie
      const baseUrl = getApiUrl();
      const logoutUrl = new URL("/api/auth/logout", baseUrl);
      const token = state.token;

      await fetch(logoutUrl.toString(), {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => {
        // Ignore network errors during logout
      });

      // Clear stored auth data
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await storage.clearAuthToken();

      // Reset onboarding status so the app treats this as a fresh user
      // This is important when account is deleted and 401 forces sign out
      await storage.resetOnboarding();

      // Clear all cached query data for security
      queryClient.clear();

      // Reset auth state
      setState({
        user: null,
        token: null,
        isLoading: false,
      });

      // Call navigation callback to redirect to SignIn
      if (signOutCallbackRef.current) {
        signOutCallbackRef.current();
      }
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, [state.token]);

  // Keep signOutRef updated with the latest signOut function
  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);

  interface AppleAuthPayload {
    identityToken: string | null;
    authorizationCode: string | null;
    selectedTier?: "basic" | "pro";
    user: {
      email: string | null;
    };
  }

  const signInWithApple = useCallback(
    async (selectedTier?: "basic" | "pro") => {
      try {
        let authPayload: AppleAuthPayload | null = null;

        // iOS native Apple authentication only
        if (!isIOS || !AppleAuthentication) {
          return {
            success: false,
            error: "Apple Sign-In is only available on iOS",
          };
        }

        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          ],
        });

        authPayload = {
          identityToken: credential.identityToken,
          authorizationCode: credential.authorizationCode,
          selectedTier,
          user: {
            email: credential.email,
          },
        };

        const baseUrl = getApiUrl();
        const url = new URL("/api/auth/social/apple", baseUrl);

        // Add timeout to prevent hanging requests during Apple review
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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

        try {
          response = await fetch(url.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(authPayload),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          data = await response.json();
        } catch (fetchError: unknown) {
          clearTimeout(timeoutId);
          const fetchErr = fetchError as { name?: string; message?: string };
          if (fetchErr.name === "AbortError") {
            console.error("Apple auth request timed out");
            return {
              success: false,
              error:
                "Request timed out. Please check your connection and try again.",
            };
          }
          console.error("Apple auth fetch error:", fetchError);
          return {
            success: false,
            error:
              "Unable to connect to server. Please check your internet connection.",
          };
        }

        if (!response.ok) {
          console.error("Apple auth server error:", response.status, data);
          return {
            success: false,
            error: data.error || "Apple sign in failed. Please try again.",
          };
        }

        // Validate required fields from server response
        if (!data.user || !data.user.id || !data.token) {
          console.error(
            "Apple auth: Invalid server response - missing user or token",
          );
          return {
            success: false,
            error: "Invalid server response. Please try again.",
          };
        }

        const userData = data.user;
        const authToken = data.token;

        const authData: StoredAuthData = {
          user: {
            id: userData.id,
            email: userData.email,
            displayName: userData.displayName,
            avatarUrl: userData.avatarUrl,
            provider: "apple",
            createdAt: userData.createdAt,
          },
          token: authToken,
        };

        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        await storage.setAuthToken(authToken);

        // Set StoreKit auth token, user ID, and sync any pending purchases
        storeKitService.setAuthToken(authToken);
        storeKitService
          .setUserId(String(userData.id))
          .catch((err) => console.warn("Failed to set StoreKit user ID:", err));
        storeKitService
          .syncPendingPurchases()
          .catch((err) =>
            console.warn("Failed to sync pending purchases:", err),
          );

        // Reset all local data for new users to ensure they see onboarding
        // This clears any leftover data from previous accounts
        // Note: isNewUser is returned inside data.user from the server
        const isNewUser = userData.isNewUser === true;
        logger.log("[Auth] Apple sign-in result - isNewUser:", isNewUser);

        if (isNewUser) {
          await storage.resetForNewUser();
        }

        setState({
          user: authData.user,
          token: authToken,
          isLoading: false,
        });

        if (isNewUser) {
          // Sync fresh state to cloud (with onboarding reset)
          await storage.syncToCloud();
        } else {
          await storage.syncFromCloud();
        }

        return { success: true };
      } catch (error: unknown) {
        const errorWithCode = error as { code?: string; message?: string };
        console.error("Apple sign in error:", error);

        // Handle specific Apple Sign-In error codes
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
            // Provide more context for iPad-specific issues
            const errorMessage =
              errorWithCode.message || "Apple sign in failed";
            return {
              success: false,
              error: `Unable to complete sign in: ${errorMessage}. Please ensure you're signed into iCloud with an Apple ID.`,
            };
        }
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(
    async (selectedTier?: "basic" | "pro") => {
      try {
        if (!promptGoogleAsync) {
          return { success: false, error: "Google sign in not available" };
        }

        const result = await promptGoogleAsync();

        if (result.type !== "success") {
          return { success: false, error: "Google sign in cancelled" };
        }

        // For useIdTokenAuthRequest, the id_token is in params, not authentication
        const idToken =
          result.params?.id_token || result.authentication?.idToken;
        const accessToken = result.authentication?.accessToken;

        if (!idToken) {
          console.error("Google sign in: no id_token received", result);
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

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.error || "Google sign in failed",
          };
        }

        // Validate required fields from server response
        if (!data.user || !data.user.id || !data.token) {
          console.error(
            "Google auth: Invalid server response - missing user or token",
          );
          return {
            success: false,
            error: "Invalid server response. Please try again.",
          };
        }

        const userData = data.user;
        const authToken = data.token;

        const authData: StoredAuthData = {
          user: {
            id: userData.id,
            email: userData.email,
            displayName: userData.displayName,
            avatarUrl: userData.avatarUrl,
            provider: "google",
            createdAt: userData.createdAt,
          },
          token: authToken,
        };

        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        await storage.setAuthToken(authToken);

        // Set StoreKit auth token, user ID, and sync any pending purchases
        storeKitService.setAuthToken(authToken);
        storeKitService
          .setUserId(String(userData.id))
          .catch((err) => console.warn("Failed to set StoreKit user ID:", err));
        storeKitService
          .syncPendingPurchases()
          .catch((err) =>
            console.warn("Failed to sync pending purchases:", err),
          );

        // Reset all local data for new users to ensure they see onboarding
        // This clears any leftover data from previous accounts
        // Note: isNewUser is returned inside data.user from the server
        const isNewUser = userData.isNewUser === true;
        logger.log("[Auth] Google sign-in result - isNewUser:", isNewUser);

        if (isNewUser) {
          await storage.resetForNewUser();
        }

        setState({
          user: authData.user,
          token: authToken,
          isLoading: false,
        });

        if (isNewUser) {
          // Sync fresh state to cloud (with onboarding reset)
          await storage.syncToCloud();
        } else {
          await storage.syncFromCloud();
        }

        return { success: true };
      } catch (error) {
        console.error("Google sign in error:", error);
        return { success: false, error: "Google sign in failed" };
      }
    },
    [promptGoogleAsync],
  );

  // Google auth is available on Android and Web when the auth request is ready
  const isGoogleAuthAvailable = isAndroid && !!promptGoogleAsync;

  const value = useMemo(
    () => ({
      ...state,
      isAuthenticated: !!state.user && !!state.token,
      isAppleAuthAvailable,
      isGoogleAuthAvailable,
      signIn,
      signUp,
      signInWithApple,
      signInWithGoogle,
      signOut,
      setSignOutCallback,
    }),
    [
      state,
      isAppleAuthAvailable,
      isGoogleAuthAvailable,
      signIn,
      signUp,
      signInWithApple,
      signInWithGoogle,
      signOut,
      setSignOutCallback,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
