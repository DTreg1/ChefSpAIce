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
import { getApiUrl, queryClient, setAuthErrorCallback, clearAuthErrorCallback } from "@/lib/query-client";
import { storage } from "@/lib/storage";

const isWeb = Platform.OS === "web";
const isIOS = Platform.OS === "ios";
const isAndroid = Platform.OS === "android";

let AppleAuthentication: typeof import("expo-apple-authentication") | null = null;
let Google: typeof import("expo-auth-session/providers/google") | null = null;
let WebBrowser: typeof import("expo-web-browser") | null = null;

// Only load Apple auth on iOS
if (isIOS) {
  AppleAuthentication = require("expo-apple-authentication");
}

// Only load Google auth on Android
if (isAndroid) {
  Google = require("expo-auth-session/providers/google");
  WebBrowser = require("expo-web-browser");
  WebBrowser?.maybeCompleteAuthSession();
}

const AUTH_STORAGE_KEY = "@chefspaice/auth";

export interface AuthUser {
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
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, displayName?: string, selectedPlan?: 'monthly' | 'annual') => Promise<{ success: boolean; error?: string }>;
  signInWithApple: (selectedPlan?: 'monthly' | 'annual') => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (selectedPlan?: 'monthly' | 'annual') => Promise<{ success: boolean; error?: string }>;
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

const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

function useGoogleAuth() {
  // Only use Google auth on Android when client ID is configured
  // Check for client ID before calling the hook to avoid "androidClientId must be defined" error
  if (!isAndroid || !Google || !GOOGLE_ANDROID_CLIENT_ID) {
    return [null, null, null] as const;
  }
  return Google.useAuthRequest({
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

  const [googleRequest, googleResponse, promptGoogleAsync] = useGoogleAuth();

  useEffect(() => {
    const checkAppleAuth = async () => {
      if (Platform.OS === "ios" && AppleAuthentication) {
        const available = await AppleAuthentication.isAvailableAsync();
        setIsAppleAuthAvailable(available);
      }
    };
    checkAppleAuth();
  }, []);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (storedData) {
          const { user, token }: StoredAuthData = JSON.parse(storedData);
          await storage.setAuthToken(token);
          setState({
            user,
            token,
            isLoading: false,
          });
          
          // Automatically sync from cloud when app loads with stored auth
          storage.syncFromCloud().then((result) => {
            if (result.success) {
              console.log("[Auth] Auto-synced data from cloud on app load");
            }
          }).catch((err) => {
            console.error("[Auth] Failed to auto-sync from cloud:", err);
          });
        } else {
          setState({
            user: null,
            token: null,
            isLoading: false,
          });
        }
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
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || "Sign in failed" };
      }

      const authData: StoredAuthData = {
        user: data.user,
        token: data.token,
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      await storage.setAuthToken(data.token);

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
    async (email: string, password: string, displayName?: string, selectedPlan?: 'monthly' | 'annual') => {
      try {
        const baseUrl = getApiUrl();
        const url = new URL("/api/auth/register", baseUrl);
        
        const response = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, displayName, selectedPlan }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          return { success: false, error: data.error || "Registration failed" };
        }

        const authData: StoredAuthData = {
          user: data.user,
          token: data.token,
        };

        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        await storage.setAuthToken(data.token);

        setState({
          user: data.user,
          token: data.token,
          isLoading: false,
        });

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
      // Clear stored auth data
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await storage.clearAuthToken();
      
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
  }, []);

  // Keep signOutRef updated with the latest signOut function
  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);

  const signInWithApple = useCallback(async (selectedPlan?: 'monthly' | 'annual') => {
    if (Platform.OS !== "ios" || !AppleAuthentication) {
      return { success: false, error: "Apple Sign-In is only available on iOS" };
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });

      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/social/apple", baseUrl);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          authorizationCode: credential.authorizationCode,
          selectedPlan,
          user: {
            email: credential.email,
            name: {
              firstName: credential.fullName?.givenName,
              lastName: credential.fullName?.familyName,
            },
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Apple sign in failed" };
      }

      const authData: StoredAuthData = {
        user: { ...data.user, provider: "apple" },
        token: data.token,
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      await storage.setAuthToken(data.token);

      setState({
        user: authData.user,
        token: data.token,
        isLoading: false,
      });

      if (data.isNewUser) {
        await storage.syncToCloud();
      } else {
        await storage.syncFromCloud();
      }

      return { success: true };
    } catch (error: any) {
      if (error.code === "ERR_CANCELED") {
        return { success: false, error: "Sign in cancelled" };
      }
      console.error("Apple sign in error:", error);
      return { success: false, error: "Apple sign in failed" };
    }
  }, []);

  const signInWithGoogle = useCallback(async (selectedPlan?: 'monthly' | 'annual') => {
    try {
      if (!promptGoogleAsync) {
        return { success: false, error: "Google sign in not available" };
      }

      const result = await promptGoogleAsync();

      if (result.type !== "success" || !result.authentication) {
        return { success: false, error: "Google sign in cancelled" };
      }

      const { accessToken, idToken } = result.authentication;

      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/social/google", baseUrl);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          accessToken,
          selectedPlan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Google sign in failed" };
      }

      const authData: StoredAuthData = {
        user: { ...data.user, provider: "google" },
        token: data.token,
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      await storage.setAuthToken(data.token);

      setState({
        user: authData.user,
        token: data.token,
        isLoading: false,
      });

      if (data.isNewUser) {
        await storage.syncToCloud();
      } else {
        await storage.syncFromCloud();
      }

      return { success: true };
    } catch (error) {
      console.error("Google sign in error:", error);
      return { success: false, error: "Google sign in failed" };
    }
  }, [promptGoogleAsync]);

  // Google auth is available on Android when the auth request is ready
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
    [state, isAppleAuthAvailable, isGoogleAuthAvailable, signIn, signUp, signInWithApple, signInWithGoogle, signOut, setSignOutCallback],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
