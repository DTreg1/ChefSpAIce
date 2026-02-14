import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";
import { apiClient } from "@/lib/api-client";
import type { ThemeColors } from "@/lib/types";

interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface SettingsActiveSessionsProps {
  theme: ThemeColors;
}

function parseUserAgent(ua: string): string {
  if (!ua) return "Unknown Device";

  const lower = ua.toLowerCase();

  let browser = "Unknown Browser";
  if (lower.includes("crios")) browser = "Chrome";
  else if (lower.includes("fxios")) browser = "Firefox";
  else if (lower.includes("edg")) browser = "Edge";
  else if (lower.includes("opr") || lower.includes("opera")) browser = "Opera";
  else if (lower.includes("chrome") && !lower.includes("chromium")) browser = "Chrome";
  else if (lower.includes("firefox")) browser = "Firefox";
  else if (lower.includes("safari") && !lower.includes("chrome")) browser = "Safari";

  if (lower.includes("chefspaice") || lower.includes("expo") || lower.includes("okhttp") || lower.includes("darwin")) {
    if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")) return "Mobile App (iOS)";
    if (lower.includes("android")) return "Mobile App (Android)";
    return "Mobile App";
  }

  let os = "";
  if (lower.includes("iphone")) os = "iPhone";
  else if (lower.includes("ipad")) os = "iPad";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("mac os") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("linux")) os = "Linux";
  else if (lower.includes("cros")) os = "ChromeOS";

  if (os) return `${browser} on ${os}`;
  return browser;
}

function maskIpAddress(ip: string): string {
  if (!ip) return "Unknown";
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  if (ip.includes(":")) {
    const v6Parts = ip.split(":");
    if (v6Parts.length >= 2) {
      return `${v6Parts[0]}:${v6Parts[1]}:***`;
    }
  }
  return ip;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth} month${diffMonth !== 1 ? "s" : ""} ago`;
}

export function SettingsActiveSessions({ theme }: SettingsActiveSessionsProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<{ sessions: Session[] }>("/api/auth/sessions");
      setSessions(data.sessions || []);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || "Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = (sessionId: string) => {
    Alert.alert(
      "Revoke Session",
      "Are you sure you want to revoke this session? The device will be signed out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            setRevokingId(sessionId);
            try {
              await apiClient.delete(`/api/auth/sessions/${sessionId}`);
              await fetchSessions();
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              Alert.alert("Error", errMsg || "Failed to revoke session");
            } finally {
              setRevokingId(null);
            }
          },
        },
      ],
    );
  };

  const handleRevokeAll = () => {
    Alert.alert(
      "Revoke All Other Sessions",
      "Are you sure you want to sign out all other devices? Only your current session will remain active.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke All",
          style: "destructive",
          onPress: async () => {
            setIsRevokingAll(true);
            try {
              await apiClient.delete("/api/auth/sessions");
              await fetchSessions();
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              Alert.alert("Error", errMsg || "Failed to revoke sessions");
            } finally {
              setIsRevokingAll(false);
            }
          },
        },
      ],
    );
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Active Sessions
      </ThemedText>

      {isLoading ? (
        <View style={styles.centerContainer} testID="loading-sessions">
          <ActivityIndicator size="small" color={AppColors.primary} />
          <ThemedText type="caption" style={{ marginTop: Spacing.sm }}>
            Loading sessions...
          </ThemedText>
        </View>
      ) : error ? (
        <View style={styles.centerContainer} testID="error-sessions">
          <Feather name="alert-circle" size={20} color={AppColors.error} />
          <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: AppColors.error }}>
            {error}
          </ThemedText>
          <Pressable
            style={[styles.retryButton, { borderColor: theme.glass?.border }]}
            onPress={fetchSessions}
            testID="button-retry-sessions"
            accessibilityRole="button"
            accessibilityLabel="Retry loading sessions"
          >
            <ThemedText type="caption" style={{ color: AppColors.primary }}>
              Tap to retry
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <>
          {sessions.map((session) => (
            <View
              key={session.id}
              style={[styles.sessionCard, { borderColor: theme.glass?.border || AppColors.border }]}
              testID={`session-card-${session.id}`}
            >
              <View style={styles.sessionInfo}>
                <View style={styles.sessionHeader}>
                  <Feather
                    name={session.isCurrent ? "monitor" : "smartphone"}
                    size={16}
                    color={theme.text}
                  />
                  <ThemedText type="body" style={styles.deviceName}>
                    {parseUserAgent(session.userAgent)}
                  </ThemedText>
                  {session.isCurrent ? (
                    <View style={[styles.currentBadge, { backgroundColor: AppColors.accent }]} testID="badge-current-session">
                      <ThemedText type="caption" style={styles.currentBadgeText}>
                        Current
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  IP: {maskIpAddress(session.ipAddress)}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Started {getRelativeTime(session.createdAt)}
                </ThemedText>
              </View>
              {!session.isCurrent ? (
                <Pressable
                  style={styles.revokeButton}
                  onPress={() => handleRevokeSession(session.id)}
                  disabled={revokingId === session.id}
                  testID={`button-revoke-session-${session.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Revoke session for ${parseUserAgent(session.userAgent)}`}
                  accessibilityState={{ disabled: revokingId === session.id }}
                >
                  {revokingId === session.id ? (
                    <ActivityIndicator size="small" color={AppColors.error} />
                  ) : (
                    <ThemedText type="caption" style={{ color: AppColors.error, fontWeight: "600" }}>
                      Revoke
                    </ThemedText>
                  )}
                </Pressable>
              ) : null}
            </View>
          ))}

          {otherSessions.length > 0 ? (
            <Pressable
              style={[styles.revokeAllButton, { borderColor: AppColors.error }]}
              onPress={handleRevokeAll}
              disabled={isRevokingAll}
              testID="button-revoke-all-sessions"
              accessibilityRole="button"
              accessibilityLabel="Revoke all other sessions"
              accessibilityState={{ disabled: isRevokingAll }}
            >
              {isRevokingAll ? (
                <ActivityIndicator size="small" color={AppColors.error} />
              ) : (
                <>
                  <Feather name="log-out" size={16} color={AppColors.error} />
                  <ThemedText type="body" style={{ color: AppColors.error, fontWeight: "600", marginLeft: Spacing.sm }}>
                    Revoke All Other Sessions
                  </ThemedText>
                </>
              )}
            </Pressable>
          ) : null}

          {sessions.length === 0 ? (
            <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
              No active sessions found.
            </ThemedText>
          ) : null}
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  centerContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sessionInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  deviceName: {
    fontWeight: "600",
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  currentBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  revokeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  revokeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
});
