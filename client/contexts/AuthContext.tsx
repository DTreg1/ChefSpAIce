import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { storage } from "@/lib/storage";

const AUTH_STORAGE_KEY = "@chefspaice/auth";

export interface AuthUser {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
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
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isGuest: true,
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
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

  const value = useMemo(
    () => ({
      ...state,
      isAuthenticated: !!state.user && !!state.token,
      signIn,
      signUp,
      signOut,
      continueAsGuest,
    }),
    [state, signIn, signUp, signOut, continueAsGuest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
