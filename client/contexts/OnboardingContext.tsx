import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { storage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  isCheckingOnboarding: boolean;
  markOnboardingComplete: () => void;
  resetOnboarding: () => void;
  recheckOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType>({
  isOnboardingComplete: false,
  isCheckingOnboarding: true,
  markOnboardingComplete: () => {},
  resetOnboarding: () => {},
  recheckOnboarding: async () => {},
});

export const useOnboardingStatus = () => useContext(OnboardingContext);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuth();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        if (isAuthenticated && user) {
          const complete = user.hasCompletedOnboarding ?? false;
          logger.log(`[Onboarding] Server check: complete=${complete}`);
          setIsOnboardingComplete(complete);
        } else {
          const needsOnboarding = await storage.needsOnboarding();
          logger.log(`[Onboarding] Local check: complete=${!needsOnboarding}`);
          setIsOnboardingComplete(!needsOnboarding);
        }
      } catch (error) {
        logger.error("Error checking onboarding status:", error);
        setIsOnboardingComplete(false);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };
    checkOnboarding();
  }, [isAuthenticated, user?.hasCompletedOnboarding]);

  const markOnboardingComplete = useCallback(() => {
    setIsOnboardingComplete(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    setIsOnboardingComplete(false);
  }, []);

  const recheckOnboarding = useCallback(async () => {
    try {
      if (isAuthenticated && user) {
        setIsOnboardingComplete(user.hasCompletedOnboarding ?? false);
      } else {
        const needsOnboarding = await storage.needsOnboarding();
        setIsOnboardingComplete(!needsOnboarding);
      }
    } catch (error) {
      logger.error("Error rechecking onboarding status:", error);
    }
  }, [isAuthenticated, user]);

  const value = useMemo(
    () => ({
      isOnboardingComplete,
      isCheckingOnboarding,
      markOnboardingComplete,
      resetOnboarding,
      recheckOnboarding,
    }),
    [
      isOnboardingComplete,
      isCheckingOnboarding,
      markOnboardingComplete,
      resetOnboarding,
      recheckOnboarding,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
