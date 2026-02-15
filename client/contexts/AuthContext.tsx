import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  queryClient,
  setAuthErrorCallback,
  clearAuthErrorCallback,
} from "@/lib/query-client";
import { apiClient } from "@/lib/api-client";
import { storage } from "@/lib/storage";
import { storeKitService } from "@/lib/storekit-service";
import { logger } from "@/lib/logger";
import {
  isBiometricEnabled,
  authenticateBiometric,
  clearBiometricPreference,
} from "@/hooks/useBiometricAuth";
import type { RestoreSessionData } from "@/lib/types";
import {
  isWeb,
  isIOS,
  isAndroid,
  AUTH_STORAGE_KEY,
  type AuthUser,
  type StoredAuthData,
  saveAuthData,
  clearAuthData,
} from "@/lib/auth-storage";
import {
  AppleAuthentication,
  useGoogleAuth,
  useAppleWebAuth,
  loginApi,
  registerApi,
  appleSignInApi,
  googleSignInApi,
} from "@/lib/auth-api";

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    selectedTier?: "pro",
  ) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  signInWithApple: (
    selectedTier?: "pro",
  ) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  signInWithGoogle: (
    selectedTier?: "pro",
  ) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<{ success: boolean; error?: string }>;
  setSignOutCallback: (callback: () => void | Promise<void>) => void;
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
  completeOnboarding: async () => ({ success: false }),
  setSignOutCallback: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
  const signOutCallbackRef = useRef<(() => void | Promise<void>) | null>(null);
  const signOutRef = useRef<(() => Promise<void>) | null>(null);

  const setSignOutCallback = useCallback((callback: () => void | Promise<void>) => {
    signOutCallbackRef.current = callback;
  }, []);

  useEffect(() => {
    setAuthErrorCallback(() => {
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
              setState({ user: null, token: null, isLoading: false });
              return;
            }
            logger.log("[Auth] Biometric verification successful");
          }

          if (token) {
            await storage.setAuthToken(token);
            storeKitService.setAuthToken(token);
          }
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
          });

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

        if (isWeb) {
          try {
            const data = await apiClient.get<RestoreSessionData>("/api/auth/restore-session", { skipAuth: true });
            if (data) {
              const authData: StoredAuthData = {
                user: data.user,
                token: null,
              };

              await AsyncStorage.setItem(
                AUTH_STORAGE_KEY,
                JSON.stringify(authData),
              );

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
                token: null,
                isLoading: false,
              });

              logger.log("[Auth] Restored session from cookie");

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

        setState({ user: null, token: null, isLoading: false });
      } catch (error) {
        logger.error("Error loading auth state:", error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };
    loadStoredAuth();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const result = await loginApi(email, password);
      if (!result.success) return result;
      const { data } = result;

      const authData: StoredAuthData = {
        user: data.user,
        token: data.token,
      };

      await saveAuthData(authData);
      await storage.setAuthToken(data.token);

      storeKitService.setAuthToken(data.token);
      storeKitService
        .setUserId(String(data.user.id))
        .catch((err) => logger.warn("Failed to set StoreKit user ID:", err));
      storeKitService
        .syncPendingPurchases()
        .catch((err) => logger.warn("Failed to sync pending purchases:", err));

      setState({
        user: data.user,
        token: data.token,
        isLoading: false,
      });

      await storage.syncFromCloud();

      import("@/lib/notifications").then(({ registerForPushNotifications }) => {
        registerForPushNotifications().catch((err) =>
          logger.warn("[Auth] Failed to register push notifications after sign in:", err),
        );
      });

      return { success: true, isNewUser: false };
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
      selectedTier?: "pro",
    ) => {
      try {
        const result = await registerApi(email, password, displayName, selectedTier);
        if (!result.success) return result;
        const { data } = result;

        const authData: StoredAuthData = {
          user: data.user,
          token: data.token,
        };

        await saveAuthData(authData);
        await storage.setAuthToken(data.token);

        storeKitService.setAuthToken(data.token);
        storeKitService
          .setUserId(String(data.user.id))
          .catch((err) => logger.warn("Failed to set StoreKit user ID:", err));
        storeKitService
          .syncPendingPurchases()
          .catch((err) =>
            logger.warn("Failed to sync pending purchases:", err),
          );

        await storage.resetOnboarding();
        await storage.syncToCloud();

        setState({
          user: data.user,
          token: data.token,
          isLoading: false,
        });

        import("@/lib/notifications").then(({ registerForPushNotifications }) => {
          registerForPushNotifications().catch((err) =>
            logger.warn("[Auth] Failed to register push notifications after sign up:", err),
          );
        });

        return { success: true, isNewUser: true };
      } catch (error) {
        logger.error("Sign up error:", error);
        return { success: false, error: "Network error. Please try again." };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      const token = state.token;

      await apiClient.post<void>("/api/auth/logout", undefined, {
        skipAuth: !token,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }).catch((err) => logger.warn("Logout API call failed", { error: err instanceof Error ? err.message : String(err) }));

      await clearAuthData();
      await storage.clearAuthToken();
      await clearBiometricPreference();
      await storage.resetOnboarding();

      queryClient.clear();

      logger.log("[Auth] Signed out");

      setState({ user: null, token: null, isLoading: false });

      if (signOutCallbackRef.current) {
        await signOutCallbackRef.current();
      }
    } catch (error) {
      logger.error("Sign out error:", error);
    }
  }, [state.token]);

  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);

  const completeOnboarding = useCallback(async () => {
    try {
      await apiClient.post<void>("/api/auth/complete-onboarding");
      setState((prev) => ({
        ...prev,
        user: prev.user ? { ...prev.user, hasCompletedOnboarding: true } : null,
      }));
      const storedData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedData) {
        const parsed: StoredAuthData = JSON.parse(storedData);
        parsed.user.hasCompletedOnboarding = true;
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
      }
      return { success: true };
    } catch (error) {
      logger.error("Complete onboarding error:", error);
      return { success: false, error: "Failed to complete onboarding" };
    }
  }, []);

  const signInWithApple = useCallback(
    async (selectedTier?: "pro") => {
      const result = await appleSignInApi(promptAppleWebAsync, selectedTier);
      if (!result.success) return result;
      const { data } = result;

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
          hasCompletedOnboarding: userData.hasCompletedOnboarding ?? false,
        },
        token: authToken,
      };

      await saveAuthData(authData);
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
        await storage.syncToCloud();
      } else {
        await storage.syncFromCloud();
      }

      import("@/lib/notifications").then(({ registerForPushNotifications }) => {
        registerForPushNotifications().catch((err) =>
          logger.warn("[Auth] Failed to register push notifications after Apple sign in:", err),
        );
      });

      return { success: true, isNewUser };
    },
    [promptAppleWebAsync],
  );

  const signInWithGoogle = useCallback(
    async (selectedTier?: "pro") => {
      const result = await googleSignInApi(promptGoogleAsync, selectedTier);
      if (!result.success) return result;
      const { data } = result;

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
          hasCompletedOnboarding: userData.hasCompletedOnboarding ?? false,
        },
        token: authToken,
      };

      await saveAuthData(authData);
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
        await storage.syncToCloud();
      } else {
        await storage.syncFromCloud();
      }

      import("@/lib/notifications").then(({ registerForPushNotifications }) => {
        registerForPushNotifications().catch((err) =>
          logger.warn("[Auth] Failed to register push notifications after Google sign in:", err),
        );
      });

      return { success: true, isNewUser };
    },
    [promptGoogleAsync],
  );

  const isGoogleAuthAvailable = !isWeb && !!promptGoogleAsync;

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
      completeOnboarding,
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
      completeOnboarding,
      setSignOutCallback,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
