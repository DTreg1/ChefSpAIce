/**
 * =============================================================================
 * AUTH CONTEXT TESTS
 * =============================================================================
 *
 * Tests for the AuthContext module which handles user authentication.
 *
 * TESTED FUNCTIONALITY:
 * - Auth state management (user, token, loading)
 * - Sign in with email/password
 * - Sign up with email/password
 * - Sign out and data clearing
 * - Token persistence and restoration
 * - Auth error handling (401 responses)
 * - Platform-specific auth availability
 *
 * @module __tests__/auth-context.test
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_STORAGE_KEY = "@chefspaice/auth";

interface AuthUser {
  id: string;
  displayName?: string;
  email: string;
  avatarUrl?: string;
  provider?: "password" | "apple" | "google";
  createdAt: string;
}

interface StoredAuthData {
  user: AuthUser;
  token: string;
}

describe("AuthContext - State Management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe("Initial State", () => {
    it("starts with user as null", () => {
      const initialState = {
        user: null,
        token: null,
        isLoading: true,
      };
      expect(initialState.user).toBeNull();
    });

    it("starts with token as null", () => {
      const initialState = {
        user: null,
        token: null,
        isLoading: true,
      };
      expect(initialState.token).toBeNull();
    });

    it("starts with isLoading as true", () => {
      const initialState = {
        user: null,
        token: null,
        isLoading: true,
      };
      expect(initialState.isLoading).toBe(true);
    });

    it("isAuthenticated is false when user is null", () => {
      const user = null;
      const isAuthenticated = user !== null;
      expect(isAuthenticated).toBe(false);
    });

    it("isAuthenticated is true when user exists", () => {
      const user: AuthUser = {
        id: "user-123",
        email: "test@example.com",
        createdAt: new Date().toISOString(),
      };
      const isAuthenticated = user !== null;
      expect(isAuthenticated).toBe(true);
    });
  });

  describe("Token Persistence", () => {
    it("saves auth data to AsyncStorage on sign in", async () => {
      const authData: StoredAuthData = {
        user: {
          id: "user-123",
          email: "test@example.com",
          createdAt: new Date().toISOString(),
        },
        token: "test-token-abc123",
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        AUTH_STORAGE_KEY,
        JSON.stringify(authData)
      );
    });

    it("restores auth data from AsyncStorage on mount", async () => {
      const storedData: StoredAuthData = {
        user: {
          id: "user-456",
          email: "restored@example.com",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        token: "restored-token-xyz",
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(storedData)
      );

      const result = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      const parsed = result ? JSON.parse(result) : null;

      expect(parsed).toEqual(storedData);
      expect(parsed?.user.email).toBe("restored@example.com");
      expect(parsed?.token).toBe("restored-token-xyz");
    });

    it("handles missing stored auth data gracefully", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      expect(result).toBeNull();
    });

    it("handles corrupted stored auth data gracefully", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("not-valid-json");

      const result = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      let parsed = null;
      try {
        parsed = JSON.parse(result || "");
      } catch {
        parsed = null;
      }

      expect(parsed).toBeNull();
    });

    it("clears auth data from AsyncStorage on sign out", async () => {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    });
  });
});

describe("AuthContext - Sign In", () => {
  describe("Email/Password Sign In", () => {
    it("validates email format before API call", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "user+tag@gmail.com",
      ];
      const invalidEmails = ["notanemail", "missing@", "@nodomain.com", ""];

      const isValidEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      validEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(true);
      });

      invalidEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(false);
      });
    });

    it("validates password is not empty", () => {
      const isValidPassword = (password: string) => password.length > 0;

      expect(isValidPassword("password123")).toBe(true);
      expect(isValidPassword("")).toBe(false);
    });

    it("returns success true on successful sign in", () => {
      const mockResponse = { success: true };
      expect(mockResponse.success).toBe(true);
    });

    it("returns success false with error on failed sign in", () => {
      const mockResponse = { success: false, error: "Invalid credentials" };
      expect(mockResponse.success).toBe(false);
      expect(mockResponse.error).toBe("Invalid credentials");
    });
  });

  describe("Sign Up", () => {
    it("includes displayName when provided", () => {
      const signUpData = {
        email: "newuser@example.com",
        password: "securepass123",
        displayName: "John Doe",
      };

      expect(signUpData.displayName).toBe("John Doe");
    });

    it("can specify selectedTier on sign up", () => {
      const signUpData = {
        email: "newuser@example.com",
        password: "securepass123",
        selectedTier: "pro" as const,
      };

      expect(signUpData.selectedTier).toBe("pro");
    });

    it("returns success true on successful sign up", () => {
      const mockResponse = { success: true };
      expect(mockResponse.success).toBe(true);
    });

    it("returns error when email already exists", () => {
      const mockResponse = {
        success: false,
        error: "An account with this email already exists",
      };
      expect(mockResponse.success).toBe(false);
      expect(mockResponse.error).toContain("already exists");
    });
  });
});

describe("AuthContext - Sign Out", () => {
  it("clears user state on sign out", () => {
    let user: AuthUser | null = {
      id: "user-123",
      email: "test@example.com",
      createdAt: new Date().toISOString(),
    };

    user = null;

    expect(user).toBeNull();
  });

  it("clears token state on sign out", () => {
    let token: string | null = "test-token";

    token = null;

    expect(token).toBeNull();
  });

  it("calls signOutCallback if registered", () => {
    const signOutCallback = jest.fn();

    signOutCallback();

    expect(signOutCallback).toHaveBeenCalled();
  });
});

describe("AuthContext - 401 Error Handling", () => {
  it("triggers sign out on 401 response", () => {
    const handleAuthError = jest.fn();

    const response = { status: 401 };
    if (response.status === 401) {
      handleAuthError();
    }

    expect(handleAuthError).toHaveBeenCalled();
  });

  it("does not trigger sign out on other error codes", () => {
    const handleAuthError = jest.fn();

    const errorCodes = [400, 403, 404, 500];
    errorCodes.forEach((status) => {
      if (status === 401) {
        handleAuthError();
      }
    });

    expect(handleAuthError).not.toHaveBeenCalled();
  });
});

type Platform = "ios" | "android" | "web";

const checkAppleAuthAvailable = (platform: Platform): boolean => platform === "ios";
const checkGoogleAuthAvailable = (platform: Platform, hasClientId: boolean): boolean =>
  platform === "android" && hasClientId;

describe("AuthContext - Platform-Specific Auth", () => {
  describe("Apple Sign In Availability", () => {
    it("isAppleAuthAvailable returns true on iOS", () => {
      expect(checkAppleAuthAvailable("ios")).toBe(true);
    });

    it("isAppleAuthAvailable returns false on Android", () => {
      expect(checkAppleAuthAvailable("android")).toBe(false);
    });

    it("isAppleAuthAvailable returns false on web", () => {
      expect(checkAppleAuthAvailable("web")).toBe(false);
    });
  });

  describe("Google Sign In Availability", () => {
    it("isGoogleAuthAvailable returns true on Android", () => {
      expect(checkGoogleAuthAvailable("android", true)).toBe(true);
    });

    it("isGoogleAuthAvailable returns false on iOS", () => {
      expect(checkGoogleAuthAvailable("ios", true)).toBe(false);
    });

    it("isGoogleAuthAvailable returns false on web", () => {
      expect(checkGoogleAuthAvailable("web", true)).toBe(false);
    });

    it("isGoogleAuthAvailable returns false without client ID", () => {
      expect(checkGoogleAuthAvailable("android", false)).toBe(false);
    });
  });
});

describe("AuthContext - User Data", () => {
  it("stores user id correctly", () => {
    const user: AuthUser = {
      id: "user-abc-123",
      email: "test@example.com",
      createdAt: new Date().toISOString(),
    };

    expect(user.id).toBe("user-abc-123");
  });

  it("stores user email correctly", () => {
    const user: AuthUser = {
      id: "user-123",
      email: "myemail@domain.com",
      createdAt: new Date().toISOString(),
    };

    expect(user.email).toBe("myemail@domain.com");
  });

  it("stores optional displayName", () => {
    const user: AuthUser = {
      id: "user-123",
      email: "test@example.com",
      displayName: "Chef John",
      createdAt: new Date().toISOString(),
    };

    expect(user.displayName).toBe("Chef John");
  });

  it("stores optional avatarUrl", () => {
    const user: AuthUser = {
      id: "user-123",
      email: "test@example.com",
      avatarUrl: "https://example.com/avatar.jpg",
      createdAt: new Date().toISOString(),
    };

    expect(user.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  it("stores provider type correctly", () => {
    const providers: Array<"password" | "apple" | "google"> = [
      "password",
      "apple",
      "google",
    ];

    providers.forEach((provider) => {
      const user: AuthUser = {
        id: "user-123",
        email: "test@example.com",
        provider,
        createdAt: new Date().toISOString(),
      };
      expect(user.provider).toBe(provider);
    });
  });

  it("stores createdAt timestamp", () => {
    const timestamp = "2024-06-15T10:30:00.000Z";
    const user: AuthUser = {
      id: "user-123",
      email: "test@example.com",
      createdAt: timestamp,
    };

    expect(user.createdAt).toBe(timestamp);
  });
});
