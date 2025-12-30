import { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useWebTheme } from "@/contexts/WebThemeContext";

const BRAND_GREEN = "#27AE60";
const AUTH_TOKEN_KEY = "chefspaice-auth-token";

interface FeedbackItem {
  id: number;
  userId: string | null;
  bucketId: number | null;
  type: string;
  category: string | null;
  message: string;
  userEmail: string | null;
  deviceInfo: string | null;
  screenContext: string | null;
  stepsToReproduce: string | null;
  severity: string | null;
  status: string;
  adminNotes: string | null;
  priority: string | null;
  createdAt: string | null;
}

interface FeedbackBucket {
  id: number;
  title: string;
  description: string | null;
  bucketType: string;
  status: string;
  priority: string | null;
  generatedPrompt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  items: FeedbackItem[];
}

interface FeedbackStats {
  total: number;
  uncategorized: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  buckets: {
    total: number;
    open: number;
    in_progress: number;
    completed: number;
  };
}

function getThemeColors(isDark: boolean) {
  return {
    background: isDark ? "#0F1419" : "#F8FAFC",
    card: isDark ? "#1A1F25" : "#FFFFFF",
    cardBorder: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)",
    textPrimary: isDark ? "#FFFFFF" : "#1A202C",
    textSecondary: isDark ? "#A0AEC0" : "#4A5568",
    textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.5)",
    success: isDark ? "#22C55E" : "#16A34A",
    warning: isDark ? "#F59E0B" : "#D97706",
    error: isDark ? "#EF4444" : "#DC2626",
    info: isDark ? "#3B82F6" : "#2563EB",
    rowHover: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
  };
}

function getApiBase(): string {
  if (typeof window === "undefined") return "";
  const isDev = window.location.port === "8081";
  return isDev ? `${window.location.protocol}//${window.location.hostname}:5000` : "";
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: string, colors: ReturnType<typeof getThemeColors>): string {
  switch (status) {
    case "open":
      return colors.info;
    case "in_progress":
      return colors.warning;
    case "completed":
      return colors.success;
    default:
      return colors.textMuted;
  }
}

function getPriorityColor(priority: string | null, colors: ReturnType<typeof getThemeColors>): string {
  switch (priority) {
    case "urgent":
      return colors.error;
    case "high":
      return colors.warning;
    case "medium":
      return colors.info;
    case "low":
      return colors.textMuted;
    default:
      return colors.textSecondary;
  }
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  colors: ReturnType<typeof getThemeColors>;
}

function StatCard({ title, value, icon, color, colors }: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <View style={styles.statHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
          <Feather name={icon as any} size={20} color={color} />
        </View>
      </View>
      <Text style={[styles.statValue, { color: colors.textPrimary }]} data-testid={`stat-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        {value}
      </Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );
}

interface FilterButtonProps {
  label: string;
  value: string;
  activeFilter: string;
  onPress: (value: string) => void;
  colors: ReturnType<typeof getThemeColors>;
}

function FilterButton({ label, value, activeFilter, onPress, colors }: FilterButtonProps) {
  const isActive = activeFilter === value;
  return (
    <Pressable
      style={[
        styles.filterButton,
        {
          backgroundColor: isActive ? BRAND_GREEN : colors.card,
          borderColor: isActive ? BRAND_GREEN : colors.cardBorder,
        },
      ]}
      onPress={() => onPress(value)}
      data-testid={`button-filter-${value}`}
    >
      <Text style={[styles.filterButtonText, { color: isActive ? "#FFFFFF" : colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

interface BucketCardProps {
  bucket: FeedbackBucket;
  colors: ReturnType<typeof getThemeColors>;
  onGeneratePrompt: (id: number) => void;
  onComplete: (id: number) => void;
  onViewPrompt: (bucket: FeedbackBucket) => void;
  isGenerating: boolean;
  isCompleting: boolean;
}

function BucketCard({ bucket, colors, onGeneratePrompt, onComplete, onViewPrompt, isGenerating, isCompleting }: BucketCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.bucketCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid={`bucket-card-${bucket.id}`}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.bucketHeader}>
        <View style={styles.bucketTitleRow}>
          <View style={[styles.bucketTypeBadge, { backgroundColor: bucket.bucketType === "bug" ? `${colors.error}20` : `${colors.info}20` }]}>
            <Feather 
              name={bucket.bucketType === "bug" ? "alert-circle" : "star"} 
              size={14} 
              color={bucket.bucketType === "bug" ? colors.error : colors.info} 
            />
            <Text style={[styles.bucketTypeText, { color: bucket.bucketType === "bug" ? colors.error : colors.info }]}>
              {bucket.bucketType === "bug" ? "Bug" : "Feature"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(bucket.status, colors)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(bucket.status, colors) }]}>
              {bucket.status}
            </Text>
          </View>
          {bucket.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(bucket.priority, colors)}15` }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(bucket.priority, colors) }]}>
                {bucket.priority}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.bucketTitleContent}>
          <Text style={[styles.bucketTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {bucket.title}
          </Text>
          <Feather 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={colors.textSecondary} 
          />
        </View>
        <View style={styles.bucketMeta}>
          <Text style={[styles.bucketItemCount, { color: colors.textSecondary }]}>
            {bucket.items.length} feedback item{bucket.items.length !== 1 ? "s" : ""}
          </Text>
          <Text style={[styles.bucketDate, { color: colors.textMuted }]}>
            {formatDateTime(bucket.createdAt)}
          </Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={[styles.bucketExpanded, { borderTopColor: colors.cardBorder }]}>
          {bucket.description && (
            <Text style={[styles.bucketDescription, { color: colors.textSecondary }]}>
              {bucket.description}
            </Text>
          )}

          <View style={styles.feedbackItemsList}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Feedback Items:</Text>
            {bucket.items.map((item) => (
              <View key={item.id} style={[styles.feedbackItem, { borderColor: colors.cardBorder }]}>
                <View style={styles.feedbackItemHeader}>
                  <View style={[styles.smallBadge, { backgroundColor: item.type === "bug" ? `${colors.error}15` : `${colors.info}15` }]}>
                    <Text style={[styles.smallBadgeText, { color: item.type === "bug" ? colors.error : colors.info }]}>
                      {item.type}
                    </Text>
                  </View>
                  {item.severity && (
                    <View style={[styles.smallBadge, { backgroundColor: `${colors.warning}15` }]}>
                      <Text style={[styles.smallBadgeText, { color: colors.warning }]}>
                        {item.severity}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.feedbackItemDate, { color: colors.textMuted }]}>
                    {formatDateTime(item.createdAt)}
                  </Text>
                </View>
                <Text style={[styles.feedbackItemMessage, { color: colors.textPrimary }]}>
                  {item.message}
                </Text>
                {item.screenContext && (
                  <Text style={[styles.feedbackItemContext, { color: colors.textMuted }]}>
                    Screen: {item.screenContext}
                  </Text>
                )}
              </View>
            ))}
          </View>

          <View style={styles.bucketActions}>
            {bucket.status !== "completed" && (
              <>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: BRAND_GREEN }]}
                  onPress={() => onGeneratePrompt(bucket.id)}
                  disabled={isGenerating}
                  data-testid={`button-generate-prompt-${bucket.id}`}
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="edit-3" size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Generate Prompt</Text>
                    </>
                  )}
                </Pressable>

                {bucket.generatedPrompt && (
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: colors.info }]}
                    onPress={() => onViewPrompt(bucket)}
                    data-testid={`button-view-prompt-${bucket.id}`}
                  >
                    <Feather name="clipboard" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>View & Copy</Text>
                  </Pressable>
                )}

                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.success }]}
                  onPress={() => onComplete(bucket.id)}
                  disabled={isCompleting}
                  data-testid={`button-complete-${bucket.id}`}
                >
                  {isCompleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="check-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Mark Complete</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
            {bucket.status === "completed" && bucket.generatedPrompt && (
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.info }]}
                onPress={() => onViewPrompt(bucket)}
                data-testid={`button-view-prompt-${bucket.id}`}
              >
                <Feather name="clipboard" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>View Prompt</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

interface PromptModalProps {
  bucket: FeedbackBucket | null;
  onClose: () => void;
  colors: ReturnType<typeof getThemeColors>;
}

function PromptModal({ bucket, onClose, colors }: PromptModalProps) {
  const [copied, setCopied] = useState(false);

  if (!bucket || !bucket.generatedPrompt) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bucket.generatedPrompt || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modal, { backgroundColor: colors.card }]} data-testid="modal-prompt">
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Implementation Prompt</Text>
          <Pressable onPress={onClose} style={styles.closeButton} data-testid="button-close-modal">
            <Feather name="x" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.modalSubheader}>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            {bucket.title}
          </Text>
          <Pressable
            style={[styles.copyButton, { backgroundColor: copied ? colors.success : BRAND_GREEN }]}
            onPress={handleCopy}
            data-testid="button-copy-prompt"
          >
            <Feather name={copied ? "check" : "copy"} size={16} color="#FFFFFF" />
            <Text style={styles.copyButtonText}>{copied ? "Copied!" : "Copy to Clipboard"}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.promptContent}>
          <Text style={[styles.promptText, { color: colors.textPrimary }]} selectable>
            {bucket.generatedPrompt}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

export default function AdminFeedbackScreen() {
  const { isDark, toggleTheme } = useWebTheme();
  const colors = getThemeColors(isDark);

  const [buckets, setBuckets] = useState<FeedbackBucket[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("open");
  const [selectedBucket, setSelectedBucket] = useState<FeedbackBucket | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [categorizing, setCategorizing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  async function fetchData() {
    setLoading(true);
    setError(null);

    const token = getAuthToken();
    if (!token) {
      setError("Authentication required. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const apiBase = getApiBase();
      const [bucketsResponse, statsResponse] = await Promise.all([
        fetch(`${apiBase}/api/feedback/buckets?status=${filter}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/api/feedback/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (bucketsResponse.status === 401 || statsResponse.status === 401) {
        setError("Authentication required. Please log in.");
        setLoading(false);
        return;
      }

      if (bucketsResponse.status === 403 || statsResponse.status === 403) {
        setError("Admin access required.");
        setLoading(false);
        return;
      }

      if (!bucketsResponse.ok || !statsResponse.ok) {
        setError("Failed to load feedback data.");
        setLoading(false);
        return;
      }

      const [bucketsData, statsData] = await Promise.all([
        bucketsResponse.json(),
        statsResponse.json(),
      ]);

      setBuckets(bucketsData.buckets || []);
      setStats(statsData);
    } catch (err) {
      console.error("Error fetching feedback data:", err);
      setError("Failed to load feedback data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePrompt(bucketId: number) {
    setGeneratingId(bucketId);
    const token = getAuthToken();
    if (!token) return;

    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/feedback/buckets/${bucketId}/generate-prompt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to generate prompt");
      }

      const data = await response.json();
      
      setBuckets(prev => prev.map(b => 
        b.id === bucketId ? { ...b, generatedPrompt: data.prompt } : b
      ));

      const updatedBucket = buckets.find(b => b.id === bucketId);
      if (updatedBucket) {
        setSelectedBucket({ ...updatedBucket, generatedPrompt: data.prompt });
      }
    } catch (err) {
      console.error("Error generating prompt:", err);
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleComplete(bucketId: number) {
    setCompletingId(bucketId);
    const token = getAuthToken();
    if (!token) return;

    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/feedback/buckets/${bucketId}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to complete bucket");
      }

      fetchData();
    } catch (err) {
      console.error("Error completing bucket:", err);
    } finally {
      setCompletingId(null);
    }
  }

  async function handleCategorizeUncategorized() {
    setCategorizing(true);
    const token = getAuthToken();
    if (!token) return;

    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/feedback/categorize-uncategorized`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to categorize feedback");
      }

      fetchData();
    } catch (err) {
      console.error("Error categorizing feedback:", err);
    } finally {
      setCategorizing(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => window.history.back()} style={styles.backButton} data-testid="button-back">
              <Feather name="arrow-left" size={20} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Feedback Resolution Manager</Text>
          </View>
          <Pressable onPress={toggleTheme} style={styles.themeButton} data-testid="button-toggle-theme">
            <Feather name={isDark ? "sun" : "moon"} size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid="container-error">
            <Feather name="alert-circle" size={48} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error}</Text>
            <Pressable
              style={[styles.retryButton, { backgroundColor: BRAND_GREEN }]}
              onPress={fetchData}
              data-testid="button-retry"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer} data-testid="container-loading">
            <ActivityIndicator size="large" color={BRAND_GREEN} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading feedback buckets...</Text>
          </View>
        ) : (
          <>
            {stats && (
              <View style={styles.statsGrid} data-testid="container-stats">
                <StatCard
                  title="Total Feedback"
                  value={stats.total}
                  icon="message-square"
                  color={colors.info}
                  colors={colors}
                />
                <StatCard
                  title="Open Buckets"
                  value={stats.buckets.open}
                  icon="inbox"
                  color={colors.warning}
                  colors={colors}
                />
                <StatCard
                  title="In Progress"
                  value={stats.buckets.in_progress}
                  icon="clock"
                  color={BRAND_GREEN}
                  colors={colors}
                />
                <StatCard
                  title="Completed"
                  value={stats.buckets.completed}
                  icon="check-circle"
                  color={colors.success}
                  colors={colors}
                />
              </View>
            )}

            {stats && stats.uncategorized > 0 && (
              <View style={[styles.uncategorizedBanner, { backgroundColor: colors.card, borderColor: colors.warning }]} data-testid="banner-uncategorized">
                <View style={styles.bannerContent}>
                  <Feather name="alert-triangle" size={20} color={colors.warning} />
                  <Text style={[styles.bannerText, { color: colors.textPrimary }]}>
                    {stats.uncategorized} uncategorized feedback item{stats.uncategorized !== 1 ? "s" : ""}
                  </Text>
                </View>
                <Pressable
                  style={[styles.categorizeButton, { backgroundColor: colors.warning }]}
                  onPress={handleCategorizeUncategorized}
                  disabled={categorizing}
                  data-testid="button-categorize"
                >
                  {categorizing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="layers" size={14} color="#FFFFFF" />
                      <Text style={styles.categorizeButtonText}>Categorize Now</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            <View style={[styles.bucketsContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid="container-buckets">
              <View style={styles.bucketsHeader}>
                <Text style={[styles.bucketsTitle, { color: colors.textPrimary }]}>Feedback Buckets</Text>
                <View style={styles.filters}>
                  <FilterButton label="Open" value="open" activeFilter={filter} onPress={setFilter} colors={colors} />
                  <FilterButton label="In Progress" value="in_progress" activeFilter={filter} onPress={setFilter} colors={colors} />
                  <FilterButton label="Completed" value="completed" activeFilter={filter} onPress={setFilter} colors={colors} />
                  <FilterButton label="All" value="all" activeFilter={filter} onPress={setFilter} colors={colors} />
                </View>
              </View>

              {buckets.length === 0 ? (
                <View style={styles.emptyState} data-testid="container-empty">
                  <Feather name="inbox" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No buckets found</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                    Feedback items are automatically grouped into buckets
                  </Text>
                </View>
              ) : (
                <View style={styles.bucketsList}>
                  {buckets.map((bucket) => (
                    <BucketCard
                      key={bucket.id}
                      bucket={bucket}
                      colors={colors}
                      onGeneratePrompt={handleGeneratePrompt}
                      onComplete={handleComplete}
                      onViewPrompt={setSelectedBucket}
                      isGenerating={generatingId === bucket.id}
                      isCompleting={completingId === bucket.id}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {selectedBucket && (
        <PromptModal
          bucket={selectedBucket}
          onClose={() => setSelectedBucket(null)}
          colors={colors}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: 1200,
    width: "100%",
    marginHorizontal: "auto",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  themeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    maxWidth: 1200,
    width: "100%",
    marginHorizontal: "auto",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    padding: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  statHeader: {
    marginBottom: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  uncategorizedBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: "500",
  },
  categorizeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  categorizeButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  bucketsContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  bucketsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    flexWrap: "wrap",
    gap: 12,
  },
  bucketsTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  filters: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  bucketsList: {
    padding: 16,
    gap: 16,
  },
  bucketCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  bucketHeader: {
    padding: 16,
  },
  bucketTitleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  bucketTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  bucketTypeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  bucketTitleContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  bucketTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  bucketMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  bucketItemCount: {
    fontSize: 13,
  },
  bucketDate: {
    fontSize: 12,
  },
  bucketExpanded: {
    padding: 16,
    borderTopWidth: 1,
  },
  bucketDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  feedbackItemsList: {
    marginBottom: 16,
  },
  feedbackItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  feedbackItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  smallBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  smallBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  feedbackItemDate: {
    fontSize: 11,
    marginLeft: "auto",
  },
  feedbackItemMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackItemContext: {
    fontSize: 12,
    marginTop: 6,
  },
  bucketActions: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 140,
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyState: {
    padding: 48,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    width: "100%",
    maxWidth: 800,
    maxHeight: "90%",
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  modalSubheader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    flexWrap: "wrap",
  },
  modalSubtitle: {
    fontSize: 14,
    flex: 1,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  copyButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  promptContent: {
    padding: 20,
    maxHeight: 500,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "monospace",
  },
});
