import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { getApiUrl } from "@/lib/query-client";
import { storage } from "@/lib/storage";

WebBrowser.maybeCompleteAuthSession();

const AUTH_STORAGE_KEY = "@chefspaice/auth";

export interface AuthUser {
  id: string;
  username?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  provider?: "password" | "apple" | "google";
  createdAt: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isGuest: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (username: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  signInWithApple: () => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  isAuthenticated: boolean;
  isAppleAuthAvailable: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isGuest: true,
  isLoading: true,
  isAuthenticated: false,
  isAppleAuthAvailable: false,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signInWithApple: async () => ({ success: false }),
  signInWithGoogle: async () => ({ success: false }),
  signOut: async () => {},
  continueAsGuest: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface StoredAuthData {
  user: AuthUser;
  token: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isGuest: true,
    isLoading: true,
  });
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    const checkAppleAuth = async () => {
      if (Platform.OS === "ios") {
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
            isGuest: false,
            isLoading: false,
          });
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Error loading auth state:", error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };
    loadStoredAuth();
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/login", baseUrl);
      
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
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
        isGuest: false,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const signUp = useCallback(
    async (username: string, password: string, displayName?: string) => {
      try {
        const baseUrl = getApiUrl();
        const url = new URL("/api/auth/register", baseUrl);
        
        const response = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, displayName }),
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
          isGuest: false,
          isLoading: false,
        });

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
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await storage.clearAuthToken();
      setState({
        user: null,
        token: null,
        isGuest: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isGuest: true,
      isLoading: false,
    }));
  }, []);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== "ios") {
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
        isGuest: false,
        isLoading: false,
      });

      return { success: true };
    } catch (error: any) {
      if (error.code === "ERR_CANCELED") {
        return { success: false, error: "Sign in cancelled" };
      }
      console.error("Apple sign in error:", error);
      return { success: false, error: "Apple sign in failed" };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
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
        isGuest: false,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      console.error("Google sign in error:", error);
      return { success: false, error: "Google sign in failed" };
    }
  }, [promptGoogleAsync]);

  const value = useMemo(
    () => ({
      ...state,
      isAuthenticated: !!state.user && !!state.token,
      isAppleAuthAvailable,
      signIn,
      signUp,
      signInWithApple,
      signInWithGoogle,
      signOut,
      continueAsGuest,
    }),
    [state, isAppleAuthAvailable, signIn, signUp, signInWithApple, signInWithGoogle, signOut, continueAsGuest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
