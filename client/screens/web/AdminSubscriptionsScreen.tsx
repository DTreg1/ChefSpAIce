import { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useWebTheme } from "@/contexts/WebThemeContext";

const BRAND_GREEN = "#27AE60";
const AUTH_TOKEN_KEY = "chefspaice-auth-token";

interface SubscriptionUser {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string | null;
}

interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  status: string;
  planType: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  user: SubscriptionUser;
}

interface SubscriptionStats {
  totalActive: number;
  totalTrialing: number;
  totalPastDue: number;
  totalCanceled: number;
  totalSubscriptions: number;
  monthlyActive: number;
  annualActive: number;
  mrr: number;
  trialConversionRate: number;
}

function getThemeColors(isDark: boolean) {
  return {
    background: isDark ? "#0F1419" : "#F8FAFC",
    backgroundGradient: isDark ? "#0A0F14" : "#EDF2F7",
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

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: string, colors: ReturnType<typeof getThemeColors>): string {
  switch (status) {
    case "active":
      return colors.success;
    case "trialing":
      return colors.info;
    case "past_due":
      return colors.warning;
    case "canceled":
    case "expired":
      return colors.error;
    default:
      return colors.textMuted;
  }
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  colors: ReturnType<typeof getThemeColors>;
}

function StatCard({ title, value, subtitle, icon, color, colors }: StatCardProps) {
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
      {subtitle && (
        <Text style={[styles.statSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      )}
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

interface SubscriptionRowProps {
  subscription: Subscription;
  onViewDetails: (sub: Subscription) => void;
  colors: ReturnType<typeof getThemeColors>;
}

function SubscriptionRow({ subscription, onViewDetails, colors }: SubscriptionRowProps) {
  const userName = subscription.user.displayName || 
    [subscription.user.firstName, subscription.user.lastName].filter(Boolean).join(" ") || 
    subscription.user.email;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.subscriptionRow,
        { backgroundColor: pressed ? colors.rowHover : "transparent", borderBottomColor: colors.cardBorder },
      ]}
      onPress={() => onViewDetails(subscription)}
      data-testid={`row-subscription-${subscription.id}`}
    >
      <View style={styles.rowCell}>
        <Text style={[styles.cellPrimary, { color: colors.textPrimary }]} numberOfLines={1}>
          {userName}
        </Text>
        <Text style={[styles.cellSecondary, { color: colors.textMuted }]} numberOfLines={1}>
          {subscription.user.email}
        </Text>
      </View>
      <View style={styles.rowCellSmall}>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(subscription.status, colors)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(subscription.status, colors) }]}>
            {subscription.status}
          </Text>
        </View>
      </View>
      <View style={styles.rowCellSmall}>
        <Text style={[styles.cellPrimary, { color: colors.textPrimary }]}>
          {subscription.planType}
        </Text>
      </View>
      <View style={styles.rowCellSmall}>
        <Text style={[styles.cellPrimary, { color: colors.textPrimary }]}>
          {formatDate(subscription.currentPeriodEnd)}
        </Text>
      </View>
      <View style={styles.rowCellAction}>
        <Feather name="chevron-right" size={20} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

interface SubscriptionDetailModalProps {
  subscription: Subscription | null;
  onClose: () => void;
  colors: ReturnType<typeof getThemeColors>;
}

function SubscriptionDetailModal({ subscription, onClose, colors }: SubscriptionDetailModalProps) {
  if (!subscription) return null;

  const userName = subscription.user.displayName || 
    [subscription.user.firstName, subscription.user.lastName].filter(Boolean).join(" ") || 
    subscription.user.email;

  const stripeCustomerUrl = subscription.stripeCustomerId
    ? `https://dashboard.stripe.com/customers/${subscription.stripeCustomerId}`
    : null;
  
  const stripeSubscriptionUrl = subscription.stripeSubscriptionId
    ? `https://dashboard.stripe.com/subscriptions/${subscription.stripeSubscriptionId}`
    : null;

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modal, { backgroundColor: colors.card }]} data-testid="modal-subscription-details">
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Subscription Details</Text>
          <Pressable onPress={onClose} style={styles.closeButton} data-testid="button-close-modal">
            <Feather name="x" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.detailSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>User Information</Text>
            <DetailRow label="Name" value={userName} colors={colors} />
            <DetailRow label="Email" value={subscription.user.email} colors={colors} />
            <DetailRow label="User ID" value={subscription.userId} colors={colors} mono />
            <DetailRow label="Account Created" value={formatDateTime(subscription.user.createdAt)} colors={colors} />
          </View>

          <View style={styles.detailSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Subscription Status</Text>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(subscription.status, colors)}20` }]}>
                <Text style={[styles.statusText, { color: getStatusColor(subscription.status, colors) }]}>
                  {subscription.status}
                </Text>
              </View>
            </View>
            <DetailRow label="Plan Type" value={subscription.planType} colors={colors} />
            <DetailRow label="Cancel at Period End" value={subscription.cancelAtPeriodEnd ? "Yes" : "No"} colors={colors} />
            {subscription.canceledAt && (
              <DetailRow label="Canceled At" value={formatDateTime(subscription.canceledAt)} colors={colors} />
            )}
          </View>

          <View style={styles.detailSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Billing Period</Text>
            <DetailRow label="Current Period Start" value={formatDateTime(subscription.currentPeriodStart)} colors={colors} />
            <DetailRow label="Current Period End" value={formatDateTime(subscription.currentPeriodEnd)} colors={colors} />
          </View>

          {subscription.trialStart && (
            <View style={styles.detailSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Trial Information</Text>
              <DetailRow label="Trial Start" value={formatDateTime(subscription.trialStart)} colors={colors} />
              <DetailRow label="Trial End" value={formatDateTime(subscription.trialEnd)} colors={colors} />
            </View>
          )}

          <View style={styles.detailSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Stripe Details</Text>
            <DetailRow label="Subscription ID" value={subscription.id} colors={colors} mono />
            <DetailRow label="Stripe Customer ID" value={subscription.stripeCustomerId || "-"} colors={colors} mono />
            <DetailRow label="Stripe Subscription ID" value={subscription.stripeSubscriptionId || "-"} colors={colors} mono />
            <DetailRow label="Stripe Price ID" value={subscription.stripePriceId || "-"} colors={colors} mono />
          </View>

          <View style={styles.stripeLinks}>
            {stripeCustomerUrl && (
              <Pressable
                style={[styles.stripeLink, { backgroundColor: colors.cardBorder }]}
                onPress={() => window.open(stripeCustomerUrl, "_blank")}
                data-testid="link-stripe-customer"
              >
                <Feather name="external-link" size={16} color={colors.textSecondary} />
                <Text style={[styles.stripeLinkText, { color: colors.textSecondary }]}>View in Stripe (Customer)</Text>
              </Pressable>
            )}
            {stripeSubscriptionUrl && (
              <Pressable
                style={[styles.stripeLink, { backgroundColor: colors.cardBorder }]}
                onPress={() => window.open(stripeSubscriptionUrl, "_blank")}
                data-testid="link-stripe-subscription"
              >
                <Feather name="external-link" size={16} color={colors.textSecondary} />
                <Text style={[styles.stripeLinkText, { color: colors.textSecondary }]}>View in Stripe (Subscription)</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.detailSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Record Timestamps</Text>
            <DetailRow label="Created At" value={formatDateTime(subscription.createdAt)} colors={colors} />
            <DetailRow label="Updated At" value={formatDateTime(subscription.updatedAt)} colors={colors} />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  colors: ReturnType<typeof getThemeColors>;
  mono?: boolean;
}

function DetailRow({ label, value, colors, mono }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.textPrimary }, mono && styles.monoText]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function AdminSubscriptionsScreen() {
  const { isDark, toggleTheme } = useWebTheme();
  const colors = getThemeColors(isDark);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

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
      const [subsResponse, statsResponse] = await Promise.all([
        fetch(`${apiBase}/api/admin/subscriptions?status=${filter}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiBase}/api/admin/subscriptions/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (subsResponse.status === 401 || statsResponse.status === 401) {
        setError("Authentication required. Please log in.");
        setLoading(false);
        return;
      }

      if (subsResponse.status === 403 || statsResponse.status === 403) {
        setError("Admin access required.");
        setLoading(false);
        return;
      }

      if (!subsResponse.ok || !statsResponse.ok) {
        setError("Failed to load subscription data.");
        setLoading(false);
        return;
      }

      const [subsData, statsData] = await Promise.all([
        subsResponse.json(),
        statsResponse.json(),
      ]);

      setSubscriptions(subsData);
      setStats(statsData);
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setError("Failed to load subscription data.");
    } finally {
      setLoading(false);
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
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Subscription Management</Text>
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
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading subscriptions...</Text>
          </View>
        ) : (
          <>
            {stats && (
              <View style={styles.statsGrid} data-testid="container-stats">
                <StatCard
                  title="Total Active"
                  value={stats.totalActive}
                  icon="check-circle"
                  color={colors.success}
                  colors={colors}
                />
                <StatCard
                  title="Trialing"
                  value={stats.totalTrialing}
                  icon="clock"
                  color={colors.info}
                  colors={colors}
                />
                <StatCard
                  title="Past Due"
                  value={stats.totalPastDue}
                  icon="alert-triangle"
                  color={colors.warning}
                  colors={colors}
                />
                <StatCard
                  title="Canceled"
                  value={stats.totalCanceled}
                  icon="x-circle"
                  color={colors.error}
                  colors={colors}
                />
                <StatCard
                  title="MRR"
                  value={formatPrice(stats.mrr)}
                  subtitle="Monthly Recurring Revenue"
                  icon="dollar-sign"
                  color={BRAND_GREEN}
                  colors={colors}
                />
                <StatCard
                  title="Trial Conversion"
                  value={`${stats.trialConversionRate}%`}
                  subtitle={`${stats.monthlyActive} monthly, ${stats.annualActive} annual`}
                  icon="trending-up"
                  color={colors.info}
                  colors={colors}
                />
              </View>
            )}

            <View style={[styles.tableContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid="container-subscriptions-table">
              <View style={styles.tableHeader}>
                <Text style={[styles.tableTitle, { color: colors.textPrimary }]}>Subscriptions</Text>
                <View style={styles.filters}>
                  <FilterButton label="All" value="all" activeFilter={filter} onPress={setFilter} colors={colors} />
                  <FilterButton label="Active" value="active" activeFilter={filter} onPress={setFilter} colors={colors} />
                  <FilterButton label="Trialing" value="trialing" activeFilter={filter} onPress={setFilter} colors={colors} />
                  <FilterButton label="Past Due" value="past_due" activeFilter={filter} onPress={setFilter} colors={colors} />
                  <FilterButton label="Canceled" value="canceled" activeFilter={filter} onPress={setFilter} colors={colors} />
                </View>
              </View>

              <View style={[styles.tableHead, { borderBottomColor: colors.cardBorder }]}>
                <Text style={[styles.columnHeader, styles.rowCell, { color: colors.textSecondary }]}>User</Text>
                <Text style={[styles.columnHeader, styles.rowCellSmall, { color: colors.textSecondary }]}>Status</Text>
                <Text style={[styles.columnHeader, styles.rowCellSmall, { color: colors.textSecondary }]}>Plan</Text>
                <Text style={[styles.columnHeader, styles.rowCellSmall, { color: colors.textSecondary }]}>Renews</Text>
                <View style={styles.rowCellAction} />
              </View>

              {subscriptions.length === 0 ? (
                <View style={styles.emptyState} data-testid="container-empty">
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No subscriptions found</Text>
                </View>
              ) : (
                subscriptions.map((sub) => (
                  <SubscriptionRow
                    key={sub.id}
                    subscription={sub}
                    onViewDetails={setSelectedSubscription}
                    colors={colors}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {selectedSubscription && (
        <SubscriptionDetailModal
          subscription={selectedSubscription}
          onClose={() => setSelectedSubscription(null)}
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
    justifyContent: "center",
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
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
  statSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  tableContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    flexWrap: "wrap",
    gap: 16,
  },
  tableTitle: {
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
    borderRadius: 8,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tableHead: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subscriptionRow: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  rowCell: {
    flex: 2,
    paddingRight: 16,
  },
  rowCellSmall: {
    flex: 1,
    paddingRight: 16,
  },
  rowCellAction: {
    width: 40,
    alignItems: "flex-end",
  },
  cellPrimary: {
    fontSize: 14,
    fontWeight: "500",
  },
  cellSecondary: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  emptyState: {
    padding: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
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
    maxWidth: 600,
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
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  monoText: {
    fontFamily: "monospace",
    fontSize: 12,
  },
  stripeLinks: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  stripeLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  stripeLinkText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
