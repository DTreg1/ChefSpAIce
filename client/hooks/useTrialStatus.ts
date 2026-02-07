/**
 * =============================================================================
 * TRIAL STATUS HOOK
 * =============================================================================
 *
 * Manages local trial status for both guest and registered users.
 * Trial is based on first app open (TRIAL_START_DATE in storage).
 *
 * KEY FEATURES:
 * - Reads trial start date from local storage
 * - Calculates days remaining in 7-day trial
 * - Works for guest users (no server required)
 * - Can be used alongside server-side subscription for registered users
 *
 * USAGE:
 * const { isTrialing, daysRemaining, isExpired, startDate } = useTrialStatus();
 *
 * @module hooks/useTrialStatus
 */

import { useState, useEffect, useCallback } from "react";
import { AppState } from "react-native";
import { storage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

const TRIAL_DURATION_DAYS = 7;

export interface TrialStatus {
  isTrialing: boolean;
  daysRemaining: number;
  isExpired: boolean;
  startDate: string | null;
  isLoading: boolean;
  isGuestTrial: boolean;
  refetch: () => Promise<void>;
}

export function useTrialStatus(): TrialStatus {
  const { isAuthenticated } = useAuth();
  const [startDate, setStartDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrialStatus = useCallback(async () => {
    try {
      const trialStart = await storage.getTrialStartDate();
      setStartDate(trialStart);
    } catch (error) {
      logger.error("[useTrialStatus] Error fetching trial status:", error);
      setStartDate(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrialStatus();
  }, [fetchTrialStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        fetchTrialStatus();
      }
    });
    return () => subscription.remove();
  }, [fetchTrialStatus]);

  const calculateTrialStatus = useCallback(() => {
    if (!startDate) {
      return {
        isTrialing: false,
        daysRemaining: 0,
        isExpired: false,
      };
    }

    const start = new Date(startDate);
    const now = new Date();
    const diffTime = now.getTime() - start.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.max(0, Math.ceil(TRIAL_DURATION_DAYS - diffDays));
    const isExpired = diffDays > TRIAL_DURATION_DAYS;
    const isTrialing = !isExpired && daysRemaining > 0;

    return {
      isTrialing,
      daysRemaining,
      isExpired,
    };
  }, [startDate]);

  const { isTrialing, daysRemaining, isExpired } = calculateTrialStatus();

  return {
    isTrialing,
    daysRemaining,
    isExpired,
    startDate,
    isLoading,
    isGuestTrial: !isAuthenticated && isTrialing,
    refetch: fetchTrialStatus,
  };
}

export function checkTrialStatus(trialStartDate: string | null): boolean {
  if (!trialStartDate) {
    return false;
  }

  const start = new Date(trialStartDate);
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  return diffDays <= TRIAL_DURATION_DAYS;
}

export function getTrialDaysRemaining(trialStartDate: string | null): number {
  if (!trialStartDate) {
    return 0;
  }

  const start = new Date(trialStartDate);
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  return Math.max(0, Math.ceil(TRIAL_DURATION_DAYS - diffDays));
}
