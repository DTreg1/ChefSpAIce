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
 * - Apple Sign-In: Native on iOS, Web OAuth on Android
 * - Google Sign-In: OAuth-based auth (iOS and Android)
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
 * - iOS: Apple Sign-In (native) + Google Sign-In available
 * - Android: Apple Sign-In (web OAuth) + Google Sign-In available
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
import {
  isBiometricEnabled,
  authenticateBiometric,
  clearBiometricPreference,
} from "@/hooks/useBiometricAuth";

const isWeb = Platform.OS === "web";
const isIOS = Platform.OS === "ios";
const isAndroid = Platform.OS === "android";

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
  isGuestUser: boolean;
  guestId: string | null;
  guestTrialStartDate: Date | null;
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
  initializeAsGuest: () => Promise<void>;
  upgradeGuestToRegistered: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  linkGuestToExistingAccount: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isGuestUser: false,
  guestId: null,
  guestTrialStartDate: null,
  isAuthenticated: false,
  isAppleAuthAvailable: false,
  isGoogleAuthAvailable: false,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signInWithApple: async () => ({ success: false }),
  signInWithGoogle: async () => ({ success: false }),
  signOut: async () => {},
  setSignOutCallback: () => {},
  initializeAsGuest: async () => {},
  upgradeGuestToRegistered: async () => ({ success: false }),
  linkGuestToExistingAccount: async () => ({ success: false }),
});

export const useAuth = () => useContext(AuthContext);

interface StoredAuthData {
  user: AuthUser;
  token: string;
}

const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const APPLE_CLIENT_ID = process.env.EXPO_PUBLIC_APPLE_CLIENT_ID;

const appleDiscovery = {
  authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
  tokenEndpoint: 'https://appleid.apple.com/auth/token',
};

function useGoogleAuth() {
  if (isWeb || !Google || (!GOOGLE_ANDROID_CLIENT_ID && !GOOGLE_IOS_CLIENT_ID)) {
    return [null, null, null] as const;
  }

  return Google.useIdTokenAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
}

function useAppleWebAuth() {
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
      responseType: 'code' as any,
      redirectUri,
    },
    appleDiscovery
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isGuestUser: false,
    guestId: null,
    guestTrialStartDate: null,
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
  void _googleResponse;

  const [_appleWebRequest, _appleWebResponse, promptAppleWebAsync] = useAppleWebAuth();
  void _appleWebRequest;
  void _appleWebResponse;

  useEffect(() => {
    const checkAppleAuth = async () => {
      if (isIOS && AppleAuthentication) {
        const available = await AppleAuthentication.isAvailableAsync();
        setIsAppleAuthAvailable(available);
      } else if (isAndroid && !!promptAppleWebAsync) {
        setIsAppleAuthAvailable(true);
      }
    };
    checkAppleAuth();
  }, [promptAppleWebAsync]);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        // First try AsyncStorage (works on all platforms)
        const storedData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (storedData) {
          const { user, token }: StoredAuthData = JSON.parse(storedData);

          const biometricOn = await isBiometricEnabled();
          if (biometricOn && !isWeb) {
            logger.log("[Auth] Biometric auth enabled, prompting verification");
            const verified = await authenticateBiometric(
              "Verify your identity to sign in",
            );
            if (!verified) {
              logger.log("[Auth] Biometric verification failed, showing login");
              const guestInfo = await storage.getGuestUserInfo();
              if (guestInfo && guestInfo.isGuest) {
                setState({
                  user: null,
                  token: null,
                  isLoading: false,
                  isGuestUser: true,
                  guestId: guestInfo.guestId,
                  guestTrialStartDate: guestInfo.trialStartDate
                    ? new Date(guestInfo.trialStartDate)
                    : null,
                });
              } else {
                setState((prev) => ({
                  ...prev,
                  isLoading: false,
                  user: null,
                  token: null,
                }));
              }
              return;
            }
            logger.log("[Auth] Biometric verification successful");
          }

          await storage.setAuthToken(token);

          // Set StoreKit auth token and user ID, sync any pending purchases
          storeKitService.setAuthToken(token);
          if (user?.id) {
            storeKitService
              .setUserId(String(user.id))
              .catch((err) =>
                logger.warn("[Auth] Failed to set StoreKit user ID:", err),
              );
          }
          storeKitService
            .syncPendingPurchases()
            .catch((err) =>
              logger.warn(
                "[Auth] Failed to sync pending purchases on restore:",
                err,
              ),
            );

          setState({
            user,
            token,
            isLoading: false,
            isGuestUser: false,
            guestId: null,
            guestTrialStartDate: null,
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
              logger.error("[Auth] Failed to auto-sync from cloud:", err);
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
              const data = (await response.json()).data as any;
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
                    logger.warn("[Auth] Failed to set StoreKit user ID:", err),
                  );
              }
              storeKitService
                .syncPendingPurchases()
                .catch((err) =>
                  logger.warn(
                    "[Auth] Failed to sync pending purchases on cookie restore:",
                    err,
                  ),
                );

              setState({
                user: data.user,
                token: data.token,
                isLoading: false,
                isGuestUser: false,
                guestId: null,
                guestTrialStartDate: null,
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
                  logger.error("[Auth] Failed to auto-sync from cloud:", err);
                });
              return;
            }
          } catch (cookieError) {
            logger.log("[Auth] No cookie session to restore");
          }
        }

        // No registered user found - check for existing guest session or create new one
        const guestInfo = await storage.getGuestUserInfo();

        if (guestInfo && guestInfo.isGuest) {
          // Restore existing guest session
          const trialStartDate = guestInfo.trialStartDate
            ? new Date(guestInfo.trialStartDate)
            : null;

          logger.log("[Auth] Restored guest session:", guestInfo.guestId);

          setState({
            user: null,
            token: null,
            isLoading: false,
            isGuestUser: true,
            guestId: guestInfo.guestId,
            guestTrialStartDate: trialStartDate,
          });
        } else {
          // No guest session exists - initialize a new one
          const newGuestInfo = await storage.initializeGuestUser();
          const trialStartDate = newGuestInfo.trialStartDate
            ? new Date(newGuestInfo.trialStartDate)
            : null;

          logger.log("[Auth] Initialized new guest session:", newGuestInfo.guestId);

          setState({
            user: null,
            token: null,
            isLoading: false,
            isGuestUser: true,
            guestId: newGuestInfo.guestId,
            guestTrialStartDate: trialStartDate,
          });
        }
      } catch (error) {
        logger.error("Error loading auth state:", error);
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

      const body = await response.json();

      if (!response.ok) {
        return { success: false, error: body.error || "Sign in failed" };
      }

      const data = body.data as any;

      // Validate required fields from server response
      if (!data.user || !data.user.id || !data.token) {
        logger.error("Login: Invalid server response - missing user or token");
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
        .catch((err) => logger.warn("Failed to set StoreKit user ID:", err));
      storeKitService
        .syncPendingPurchases()
        .catch((err) => logger.warn("Failed to sync pending purchases:", err));

      // Check if user was a guest and migrate their data
      const isGuest = await storage.getIsGuestUser();
      if (isGuest) {
        logger.log("[SignIn] Migrating guest data to account...");
        const migrationResult = await storage.migrateGuestDataToAccount(
          data.token,
        );
        if (migrationResult.success) {
          logger.log("[SignIn] Guest data migration successful");
        } else {
          logger.log(
            "[SignIn] Guest data migration failed:",
            migrationResult.error,
          );
        }
      }

      // Clear guest status since user is now authenticated
      await storage.clearGuestUser();

      setState({
        user: data.user,
        token: data.token,
        isLoading: false,
        isGuestUser: false,
        guestId: null,
        guestTrialStartDate: null,
      });

      await storage.syncFromCloud();

      return { success: true };
    } catch (error) {
      logger.error("Sign in error:", error);
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

        const body = await response.json();
        logger.log("[SignUp] Response data:", body);

        if (!response.ok) {
          return { success: false, error: body.error || "Registration failed" };
        }

        const data = body.data as any;

        // Validate required fields from server response
        if (!data.user || !data.user.id || !data.token) {
          logger.error(
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
          .catch((err) => logger.warn("Failed to set StoreKit user ID:", err));
        storeKitService
          .syncPendingPurchases()
          .catch((err) =>
            logger.warn("Failed to sync pending purchases:", err),
          );

        // Check if user was a guest and migrate their data
        const isGuest = await storage.getIsGuestUser();
        if (isGuest) {
          logger.log("[SignUp] Migrating guest data to new account...");
          const migrationResult = await storage.migrateGuestDataToAccount(
            data.token,
          );
          if (migrationResult.success) {
            logger.log("[SignUp] Guest data migration successful");
          } else {
            logger.log(
              "[SignUp] Guest data migration failed:",
              migrationResult.error,
            );
            // Continue anyway - user can still use the app, data will be local
          }
        } else {
          // Reset onboarding status for non-guest new users
          // This prevents stale local data from previous sessions from affecting the new user
          await storage.resetOnboarding();
          // Sync fresh state to cloud (with onboarding reset)
          await storage.syncToCloud();
        }

        // Clear guest status since user is now authenticated
        await storage.clearGuestUser();

        setState({
          user: data.user,
          token: data.token,
          isLoading: false,
          isGuestUser: false,
          guestId: null,
          guestTrialStartDate: null,
        });

        return { success: true };
      } catch (error) {
        logger.error("Sign up error:", error);
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
      await clearBiometricPreference();

      // Reset onboarding status so the app treats this as a fresh user
      // This is important when account is deleted and 401 forces sign out
      await storage.resetOnboarding();

      // Clear all user-specific data so the new guest starts fresh
      await Promise.all([
        AsyncStorage.removeItem("@chefspaice/inventory"),
        AsyncStorage.removeItem("@chefspaice/recipes"),
        AsyncStorage.removeItem("@chefspaice/preferences"),
        AsyncStorage.removeItem("@chefspaice/meal_plans"),
        AsyncStorage.removeItem("@chefspaice/shopping_list"),
        AsyncStorage.removeItem("@chefspaice/chat_history"),
        AsyncStorage.removeItem("@chefspaice/user_profile"),
        AsyncStorage.removeItem("@chefspaice/cookware"),
        AsyncStorage.removeItem("@chefspaice/custom_storage_locations"),
        AsyncStorage.removeItem("@chefspaice/waste_log"),
        AsyncStorage.removeItem("@chefspaice/consumed_log"),
        AsyncStorage.removeItem("@chefspaice/analytics"),
        AsyncStorage.removeItem("@chefspaice/onboarding_step"),
        AsyncStorage.removeItem("@chefspaice/pending_purchase"),
        AsyncStorage.removeItem("@chefspaice/register_prompt_dismissed_at"),
        AsyncStorage.removeItem("@chefspaice/onboarding"),
      ]);

      // Clear all cached query data for security
      queryClient.clear();

      // Clear any previous guest data (old guest data is gone after sign out)
      await storage.clearGuestUser();

      // Initialize a new guest session for the signed out user
      const newGuestInfo = await storage.initializeGuestUser();
      const trialStartDate = newGuestInfo.trialStartDate
        ? new Date(newGuestInfo.trialStartDate)
        : null;

      logger.log("[Auth] Signed out, initialized new guest session:", newGuestInfo.guestId);

      // Reset auth state and set up as new guest
      setState({
        user: null,
        token: null,
        isLoading: false,
        isGuestUser: true,
        guestId: newGuestInfo.guestId,
        guestTrialStartDate: trialStartDate,
      });

      // Call navigation callback to redirect to SignIn
      if (signOutCallbackRef.current) {
        signOutCallbackRef.current();
      }
    } catch (error) {
      logger.error("Sign out error:", error);
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

            const _body: any = await response.json();
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

            const _body: any = await response.json();
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

        const userData = data!.user;
        const authToken = data!.token;

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

        storeKitService.setAuthToken(authToken);
        storeKitService
          .setUserId(String(userData.id))
          .catch((err) => logger.warn("Failed to set StoreKit user ID:", err));
        storeKitService
          .syncPendingPurchases()
          .catch((err) =>
            logger.warn("Failed to sync pending purchases:", err),
          );

        const isGuest = await storage.getIsGuestUser();
        if (isGuest) {
          logger.log("[AppleAuth] Migrating guest data to account...");
          const migrationResult = await storage.migrateGuestDataToAccount(
            authToken,
          );
          if (migrationResult.success) {
            logger.log("[AppleAuth] Guest data migration successful");
          } else {
            logger.log(
              "[AppleAuth] Guest data migration failed:",
              migrationResult.error,
            );
          }
        }

        const isNewUser = userData.isNewUser === true && !isGuest;
        logger.log("[Auth] Apple sign-in result - isNewUser:", isNewUser);

        if (isNewUser) {
          await storage.resetForNewUser();
        }

        await storage.clearGuestUser();

        setState({
          user: authData.user,
          token: authToken,
          isLoading: false,
          isGuestUser: false,
          guestId: null,
          guestTrialStartDate: null,
        });

        if (isNewUser) {
          await storage.syncToCloud();
        } else {
          await storage.syncFromCloud();
        }

        return { success: true };
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
    },
    [promptAppleWebAsync],
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

        const body = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: body.error || "Google sign in failed",
          };
        }

        const data = body.data as any;

        // Validate required fields from server response
        if (!data.user || !data.user.id || !data.token) {
          logger.error(
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
          .catch((err) => logger.warn("Failed to set StoreKit user ID:", err));
        storeKitService
          .syncPendingPurchases()
          .catch((err) =>
            logger.warn("Failed to sync pending purchases:", err),
          );

        // Check if user was a guest and migrate their data FIRST
        const isGuest = await storage.getIsGuestUser();
        if (isGuest) {
          logger.log("[GoogleAuth] Migrating guest data to account...");
          const migrationResult = await storage.migrateGuestDataToAccount(
            authToken,
          );
          if (migrationResult.success) {
            logger.log("[GoogleAuth] Guest data migration successful");
          } else {
            logger.log(
              "[GoogleAuth] Guest data migration failed:",
              migrationResult.error,
            );
          }
        }

        // Reset all local data for new users to ensure they see onboarding
        // This clears any leftover data from previous accounts
        // Note: isNewUser is returned inside data.user from the server
        // But if they were a guest, don't reset - use their migrated data
        const isNewUser = userData.isNewUser === true && !isGuest;
        logger.log("[Auth] Google sign-in result - isNewUser:", isNewUser);

        if (isNewUser) {
          await storage.resetForNewUser();
        }

        // Clear guest status since user is now authenticated
        await storage.clearGuestUser();

        setState({
          user: authData.user,
          token: authToken,
          isLoading: false,
          isGuestUser: false,
          guestId: null,
          guestTrialStartDate: null,
        });

        if (isNewUser) {
          // Sync fresh state to cloud (with onboarding reset)
          await storage.syncToCloud();
        } else {
          await storage.syncFromCloud();
        }

        return { success: true };
      } catch (error) {
        logger.error("Google sign in error:", error);
        return { success: false, error: "Google sign in failed" };
      }
    },
    [promptGoogleAsync],
  );

  const isGoogleAuthAvailable = !isWeb && !!promptGoogleAsync;

  const initializeAsGuest = useCallback(async () => {
    try {
      // Clear any existing auth state first
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await storage.clearAuthToken();
      await storage.clearGuestUser();

      // Initialize a new guest session
      const newGuestInfo = await storage.initializeGuestUser();
      const trialStartDate = newGuestInfo.trialStartDate
        ? new Date(newGuestInfo.trialStartDate)
        : null;

      logger.log("[Auth] Initialized as guest:", newGuestInfo.guestId);

      setState({
        user: null,
        token: null,
        isLoading: false,
        isGuestUser: true,
        guestId: newGuestInfo.guestId,
        guestTrialStartDate: trialStartDate,
      });
    } catch (error) {
      logger.error("Error initializing as guest:", error);
    }
  }, []);

  const upgradeGuestToRegistered = useCallback(
    async (email: string, password: string, displayName?: string) => {
      // This is essentially signUp, but ensures we're coming from a guest state
      // The signUp function already handles guest data migration
      if (!state.isGuestUser) {
        return { success: false, error: "User is not a guest" };
      }
      return signUp(email, password, displayName);
    },
    [state.isGuestUser, signUp],
  );

  const linkGuestToExistingAccount = useCallback(
    async (email: string, password: string) => {
      // This is essentially signIn, but ensures we're coming from a guest state
      // The signIn function already handles guest data migration
      if (!state.isGuestUser) {
        return { success: false, error: "User is not a guest" };
      }
      return signIn(email, password);
    },
    [state.isGuestUser, signIn],
  );

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
      initializeAsGuest,
      upgradeGuestToRegistered,
      linkGuestToExistingAccount,
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
      initializeAsGuest,
      upgradeGuestToRegistered,
      linkGuestToExistingAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
