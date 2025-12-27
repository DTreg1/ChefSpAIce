import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { storage } from "@/lib/storage";

interface OnboardingContextType {
  isOnboardingComplete: boolean;
  isCheckingOnboarding: boolean;
  markOnboardingComplete: () => void;
}

const OnboardingContext = createContext<OnboardingContextType>({
  isOnboardingComplete: false,
  isCheckingOnboarding: true,
  markOnboardingComplete: () => {},
});

export const useOnboardingStatus = () => useContext(OnboardingContext);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const needsOnboarding = await storage.needsOnboarding();
        setIsOnboardingComplete(!needsOnboarding);
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setIsOnboardingComplete(false);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };
    checkOnboarding();
  }, []);

  const markOnboardingComplete = useCallback(() => {
    setIsOnboardingComplete(true);
  }, []);

  const value = useMemo(
    () => ({
      isOnboardingComplete,
      isCheckingOnboarding,
      markOnboardingComplete,
    }),
    [isOnboardingComplete, isCheckingOnboarding, markOnboardingComplete],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
