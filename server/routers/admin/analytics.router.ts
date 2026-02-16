import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { users, subscriptions, userSyncData, conversionEvents } from "@shared/schema";
import { eq, sql, count, and, gte, isNotNull } from "drizzle-orm";
import { successResponse } from "../../lib/apiResponse";
import { CacheService, MemoryCacheStore } from "../../lib/cache";

const router = Router();

const FIVE_MINUTES = 5 * 60 * 1000;

const dashboardCache = new CacheService<any>({
  defaultTtlMs: FIVE_MINUTES,
  store: new MemoryCacheStore<any>({ maxSize: 50 }),
});

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = await dashboardCache.get(key);
  if (hit !== undefined) return hit as T;
  const result = await fn();
  await dashboardCache.set(key, result);
  return result;
}

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await cached("analytics:dashboard", async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [userStatsResult, subStatsResult, [activeUsers7Result], userGrowthResult] = await Promise.all([
        db.execute(sql`
          SELECT
            COUNT(*)::integer AS total_users,
            COUNT(*) FILTER (WHERE created_at >= ${sevenDaysAgo})::integer AS new_7d,
            COUNT(*) FILTER (WHERE created_at >= ${thirtyDaysAgo})::integer AS new_30d,
            COUNT(*) FILTER (WHERE subscription_tier = 'STANDARD')::integer AS standard,
            COUNT(*) FILTER (WHERE subscription_status = 'active')::integer AS active_status,
            COUNT(*) FILTER (WHERE subscription_status = 'canceled')::integer AS canceled,
            COUNT(*) FILTER (WHERE subscription_status = 'expired')::integer AS expired,
            COALESCE(SUM(ai_recipes_generated_this_month), 0)::integer AS ai_total
          FROM users
        `),
        db.execute(sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'active')::integer AS active_subs,
            COUNT(*) FILTER (WHERE status = 'active' AND plan_type = 'monthly')::integer AS monthly_subs,
            COUNT(*) FILTER (WHERE status = 'active' AND plan_type = 'annual')::integer AS annual_subs
          FROM subscriptions
        `),
        db.select({ count: sql<number>`COUNT(DISTINCT ${userSyncData.userId})` })
          .from(userSyncData)
          .where(gte(userSyncData.lastSyncedAt, sevenDaysAgo)),
        db.execute(sql`
          SELECT
            TO_CHAR(created_at, 'YYYY-MM') as month,
            COUNT(*) as count
          FROM users
          WHERE created_at >= NOW() - INTERVAL '12 months'
          GROUP BY TO_CHAR(created_at, 'YYYY-MM')
          ORDER BY month ASC
        `),
      ]);

      const u = userStatsResult.rows[0] as any;
      const s = subStatsResult.rows[0] as any;

      let topFoodItems: { name: string; count: number }[] = [];
      try {
        const foodItemsResult = await db.execute(sql`
          SELECT name, COUNT(*) as count
          FROM user_inventory_items
          WHERE name IS NOT NULL AND deleted_at IS NULL
          GROUP BY name
          ORDER BY count DESC
          LIMIT 10
        `);
        topFoodItems = (foodItemsResult.rows as any[]).map((row) => ({
          name: row.name as string,
          count: Number(row.count),
        }));
      } catch {
        topFoodItems = [];
      }

      const monthlySubscribers = Number(s.monthly_subs || 0);
      const annualSubscribers = Number(s.annual_subs || 0);
      const avgMonthlyPrice = Math.round((499 + 999) / 2);
      const avgAnnualPrice = Math.round((3999 + 7999) / 2);
      const mrr = monthlySubscribers * avgMonthlyPrice + Math.round(annualSubscribers * avgAnnualPrice / 12);

      return {
        userMetrics: {
          totalUsers: Number(u.total_users || 0),
          newUsersLast7Days: Number(u.new_7d || 0),
          newUsersLast30Days: Number(u.new_30d || 0),
          activeUsersLast7Days: Number(activeUsers7Result?.count || 0),
        },
        subscriptionBreakdown: {
          standard: Number(u.standard || 0),
          active: Number(u.active_status || 0),
          canceled: Number(u.canceled || 0),
          expired: Number(u.expired || 0),
        },
        revenueMetrics: {
          totalActiveSubscribers: Number(s.active_subs || 0),
          monthlySubscribers,
          annualSubscribers,
          mrr,
          arr: mrr * 12,
        },
        aiUsage: {
          totalRecipesThisMonth: Number(u.ai_total || 0),
        },
        topFoodItems,
        userGrowth: (userGrowthResult.rows as any[]).map((row) => ({
          month: row.month as string,
          count: Number(row.count),
        })),
      };
    });

    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
});

router.get("/subscription-metrics", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await cached("analytics:subscription-metrics", async () => {
      const STANDARD_MONTHLY_CENTS = 999;
      const STANDARD_ANNUAL_CENTS = 7999;

      const [
        [trialCount],
        [standardCount],
        [standardMonthlyActive],
        [standardAnnualActive],
      ] = await Promise.all([
        db.select({ count: count() }).from(users).where(eq(users.subscriptionTier, "STANDARD")),
        db.select({ count: count() }).from(users).where(eq(users.subscriptionTier, "STANDARD")),
        db.select({ count: count() }).from(subscriptions).where(
          and(eq(subscriptions.status, "active"), eq(subscriptions.planType, "monthly"),
            sql`${subscriptions.userId} IN (SELECT id FROM users WHERE subscription_tier = 'STANDARD')`)
        ),
        db.select({ count: count() }).from(subscriptions).where(
          and(eq(subscriptions.status, "active"), eq(subscriptions.planType, "annual"),
            sql`${subscriptions.userId} IN (SELECT id FROM users WHERE subscription_tier = 'STANDARD')`)
        ),
      ]);

      const standardMonthlyCount = Number(standardMonthlyActive?.count || 0);
      const standardAnnualCount = Number(standardAnnualActive?.count || 0);

      const standardMonthlyMRR = standardMonthlyCount * STANDARD_MONTHLY_CENTS;
      const standardAnnualMRR = Math.round((standardAnnualCount * STANDARD_ANNUAL_CENTS) / 12);
      const totalMRR = standardMonthlyMRR + standardAnnualMRR;

      const standardActiveCount = standardMonthlyCount + standardAnnualCount;

      return {
        tierCounts: {
          STANDARD: Number(trialCount?.count || 0) + Number(standardCount?.count || 0),
        },
        tierActiveCounts: {
          STANDARD: standardActiveCount,
        },
        activeCounts: {
          standardMonthly: standardMonthlyCount,
          standardAnnual: standardAnnualCount,
        },
        mrrBreakdown: {
          standardMonthlyMRR,
          standardAnnualMRR,
          totalMRR,
        },
        arr: totalMRR * 12,
      };
    });

    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
});

router.get("/trial-conversion", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await cached("analytics:trial-conversion", async () => {
      const [
        [trialsStartedResult],
        [trialsConvertedResult],
        [currentlyTrialingResult],
        [avgTrialDurationResult],
      ] = await Promise.all([
        db.select({ count: count() }).from(subscriptions).where(isNotNull(subscriptions.trialStart)),
        db.select({ count: count() }).from(subscriptions).where(
          and(isNotNull(subscriptions.trialStart), eq(subscriptions.status, "active"))
        ),
        db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
        db.select({
          avgDays: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(${subscriptions.trialEnd}, NOW()) - ${subscriptions.trialStart})) / 86400), 0)`,
        }).from(subscriptions).where(isNotNull(subscriptions.trialStart)),
      ]);

      const trialsStarted = Number(trialsStartedResult?.count || 0);
      const trialsConverted = Number(trialsConvertedResult?.count || 0);
      const conversionRate = trialsStarted > 0
        ? Math.round((trialsConverted / trialsStarted) * 10000) / 100
        : 0;

      return {
        trialsStarted,
        trialsConverted,
        conversionRate,
        currentlyTrialing: Number(currentlyTrialingResult?.count || 0),
        averageTrialDurationDays: Math.round(Number(avgTrialDurationResult?.avgDays || 0) * 100) / 100,
      };
    });

    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
});

router.get("/churn-rate", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await cached("analytics:churn-rate", async () => {
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [monthlyChurnResult, [totalActiveResult], [currentMonthCancellationsResult], [totalCanceledResult]] = await Promise.all([
        db.execute(sql`
          WITH months AS (
            SELECT
              TO_CHAR(d.month_start, 'YYYY-MM') as month,
              d.month_start
            FROM generate_series(
              date_trunc('month', ${twelveMonthsAgo}::timestamp),
              date_trunc('month', NOW()),
              '1 month'::interval
            ) d(month_start)
          ),
          monthly_cancellations AS (
            SELECT
              TO_CHAR(canceled_at, 'YYYY-MM') as month,
              COUNT(*)::integer as cancellations
            FROM subscriptions
            WHERE canceled_at IS NOT NULL
              AND canceled_at >= ${twelveMonthsAgo}
            GROUP BY TO_CHAR(canceled_at, 'YYYY-MM')
          ),
          monthly_active AS (
            SELECT
              TO_CHAR(m.month_start, 'YYYY-MM') as month,
              COUNT(s.id)::integer as active_count
            FROM months m
            LEFT JOIN subscriptions s ON s.current_period_start <= m.month_start
              AND (s.canceled_at IS NULL OR s.canceled_at >= m.month_start)
              AND s.status IN ('active', 'canceled')
            GROUP BY m.month_start
          )
          SELECT
            m.month,
            COALESCE(mc.cancellations, 0) as cancellations,
            COALESCE(ma.active_count, 0) as active_at_start
          FROM months m
          LEFT JOIN monthly_cancellations mc ON m.month = mc.month
          LEFT JOIN monthly_active ma ON m.month = ma.month
          ORDER BY m.month ASC
        `),
        db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
        db.select({ count: count() }).from(subscriptions).where(
          and(
            isNotNull(subscriptions.canceledAt),
            gte(subscriptions.canceledAt, currentMonthStart)
          )
        ),
        db.select({ count: count() }).from(subscriptions).where(isNotNull(subscriptions.canceledAt)),
      ]);

      const totalActive = Number(totalActiveResult?.count || 0);
      const currentMonthCancellations = Number(currentMonthCancellationsResult?.count || 0);
      const activeAtStartOfMonth = totalActive + currentMonthCancellations;
      const currentMonthChurnRate = activeAtStartOfMonth > 0
        ? Math.round((currentMonthCancellations / activeAtStartOfMonth) * 10000) / 100
        : 0;

      const monthlyChurn = (monthlyChurnResult.rows as any[]).map((row) => {
        const cancellations = Number(row.cancellations);
        const activeAtStart = Number(row.active_at_start || 0);
        const churnRate = activeAtStart > 0
          ? Math.round((cancellations / activeAtStart) * 10000) / 100
          : 0;
        return {
          month: row.month as string,
          cancellations,
          churnRate,
        };
      });

      return {
        monthlyChurn,
        currentMonthChurnRate,
        totalCanceledAllTime: Number(totalCanceledResult?.count || 0),
      };
    });

    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
});

router.get("/conversion-funnel", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await cached("analytics:conversion-funnel", async () => {
      const [
        [trialUsersResult],
        [proUsersResult],
        [totalUsersResult],
      ] = await Promise.all([
        db.select({ count: count() }).from(users).where(eq(users.subscriptionTier, "STANDARD")),
        db.select({ count: count() }).from(users).where(eq(users.subscriptionTier, "STANDARD")),
        db.select({ count: count() }).from(users),
      ]);

      const standardUsers = Number(trialUsersResult?.count || 0) + Number(proUsersResult?.count || 0);
      const totalUsers = Number(totalUsersResult?.count || 0);

      const freeToPaidRate = totalUsers > 0
        ? Math.round((standardUsers / totalUsers) * 10000) / 100
        : 0;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [recentConversions, recentConversions30d, [totalConversionsResult]] = await Promise.all([
        db
          .select({
            fromTier: conversionEvents.fromTier,
            toTier: conversionEvents.toTier,
            count: count(),
          })
          .from(conversionEvents)
          .groupBy(conversionEvents.fromTier, conversionEvents.toTier),
        db
          .select({
            fromTier: conversionEvents.fromTier,
            toTier: conversionEvents.toTier,
            count: count(),
          })
          .from(conversionEvents)
          .where(gte(conversionEvents.createdAt, thirtyDaysAgo))
          .groupBy(conversionEvents.fromTier, conversionEvents.toTier),
        db.select({ count: count() }).from(conversionEvents),
      ]);

      const conversionBreakdown: Record<string, number> = {};
      for (const row of recentConversions) {
        const key = `${row.fromTier}_to_${row.toTier}`;
        conversionBreakdown[key] = Number(row.count);
      }

      const recentBreakdown: Record<string, number> = {};
      for (const row of recentConversions30d) {
        const key = `${row.fromTier}_to_${row.toTier}`;
        recentBreakdown[key] = Number(row.count);
      }

      return {
        standardUsers,
        freeToPaidRate,
        totalConversions: Number(totalConversionsResult?.count || 0),
        conversionBreakdown,
        recentBreakdown,
      };
    });

    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
});

router.get("/advanced-metrics", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await cached("analytics:advanced-metrics", async () => {
      const STANDARD_MONTHLY_CENTS = 999;
      const STANDARD_ANNUAL_CENTS = 7999;

      const [mrrResult, churnResult, conversionResult, cohortResult] = await Promise.all([
        db.execute(sql`
          WITH months AS (
            SELECT TO_CHAR(d.month_start, 'YYYY-MM') as month, d.month_start
            FROM generate_series(
              date_trunc('month', NOW() - INTERVAL '11 months'),
              date_trunc('month', NOW()),
              '1 month'::interval
            ) d(month_start)
          ),
          monthly_subs AS (
            SELECT
              m.month,
              COUNT(CASE WHEN s.plan_type = 'monthly' THEN 1 END)::integer as monthly_count,
              COUNT(CASE WHEN s.plan_type = 'annual' THEN 1 END)::integer as annual_count,
              COUNT(s.id)::integer as total_active
            FROM months m
            LEFT JOIN subscriptions s ON s.status = 'active'
              AND COALESCE(s.current_period_start, s.created_at) <= (m.month_start + INTERVAL '1 month' - INTERVAL '1 day')
              AND (s.canceled_at IS NULL OR s.canceled_at >= m.month_start)
            GROUP BY m.month
            ORDER BY m.month ASC
          )
          SELECT month, monthly_count, annual_count, total_active
          FROM monthly_subs
        `),

        db.execute(sql`
          WITH months AS (
            SELECT TO_CHAR(d.month_start, 'YYYY-MM') as month, d.month_start
            FROM generate_series(
              date_trunc('month', NOW() - INTERVAL '11 months'),
              date_trunc('month', NOW()),
              '1 month'::interval
            ) d(month_start)
          ),
          monthly_cancellations AS (
            SELECT
              TO_CHAR(canceled_at, 'YYYY-MM') as month,
              COUNT(*)::integer as cancellations
            FROM subscriptions
            WHERE canceled_at IS NOT NULL
              AND canceled_at >= date_trunc('month', NOW() - INTERVAL '11 months')
            GROUP BY TO_CHAR(canceled_at, 'YYYY-MM')
          ),
          monthly_active AS (
            SELECT
              m.month,
              COUNT(s.id)::integer as active_count
            FROM months m
            LEFT JOIN subscriptions s ON COALESCE(s.current_period_start, s.created_at) < m.month_start
              AND (s.canceled_at IS NULL OR s.canceled_at >= m.month_start)
              AND s.status IN ('active', 'canceled')
            GROUP BY m.month
          )
          SELECT
            m.month,
            COALESCE(mc.cancellations, 0) as cancellations,
            COALESCE(ma.active_count, 0) as active_at_start
          FROM months m
          LEFT JOIN monthly_cancellations mc ON m.month = mc.month
          LEFT JOIN monthly_active ma ON m.month = ma.month
          ORDER BY m.month ASC
        `),

        db.execute(sql`
          WITH months AS (
            SELECT TO_CHAR(d.month_start, 'YYYY-MM') as month, d.month_start
            FROM generate_series(
              date_trunc('month', NOW() - INTERVAL '11 months'),
              date_trunc('month', NOW()),
              '1 month'::interval
            ) d(month_start)
          ),
          monthly_conversions AS (
            SELECT
              TO_CHAR(created_at, 'YYYY-MM') as month,
              COUNT(*)::integer as conversions
            FROM conversion_events
            WHERE to_tier = 'STANDARD'
              AND created_at >= date_trunc('month', NOW() - INTERVAL '11 months')
            GROUP BY TO_CHAR(created_at, 'YYYY-MM')
          ),
          monthly_trial_starts AS (
            SELECT
              TO_CHAR(trial_start, 'YYYY-MM') as month,
              COUNT(*)::integer as trial_starts
            FROM subscriptions
            WHERE trial_start IS NOT NULL
              AND trial_start >= date_trunc('month', NOW() - INTERVAL '11 months')
            GROUP BY TO_CHAR(trial_start, 'YYYY-MM')
          )
          SELECT
            m.month,
            COALESCE(mc.conversions, 0) as conversions,
            COALESCE(mt.trial_starts, 0) as trial_starts
          FROM months m
          LEFT JOIN monthly_conversions mc ON m.month = mc.month
          LEFT JOIN monthly_trial_starts mt ON m.month = mt.month
          ORDER BY m.month ASC
        `),

        db.execute(sql`
          WITH cohort_months AS (
            SELECT
              TO_CHAR(created_at, 'YYYY-MM') as cohort,
              date_trunc('month', created_at) as cohort_start,
              id as user_id
            FROM users
            WHERE created_at >= date_trunc('month', NOW() - INTERVAL '11 months')
          ),
          cohort_sizes AS (
            SELECT cohort, cohort_start, COUNT(*)::integer as total_users
            FROM cohort_months
            GROUP BY cohort, cohort_start
          ),
          retention_data AS (
            SELECT
              cs.cohort,
              cs.total_users,
              n.month_offset,
              COUNT(DISTINCT CASE
                WHEN s.status = 'active'
                  AND COALESCE(s.current_period_start, s.created_at) <= cs.cohort_start + (n.month_offset || ' months')::interval
                  AND (s.canceled_at IS NULL OR s.canceled_at > cs.cohort_start + (n.month_offset || ' months')::interval)
                THEN cm.user_id
              END)::integer as retained_users
            FROM cohort_sizes cs
            CROSS JOIN generate_series(0, 6) n(month_offset)
            JOIN cohort_months cm ON cm.cohort = cs.cohort
            LEFT JOIN subscriptions s ON s.user_id = cm.user_id
            WHERE cs.cohort_start + (n.month_offset || ' months')::interval <= date_trunc('month', NOW()) + INTERVAL '1 month'
            GROUP BY cs.cohort, cs.total_users, n.month_offset
            ORDER BY cs.cohort, n.month_offset
          )
          SELECT cohort, total_users, month_offset, retained_users
          FROM retention_data
          ORDER BY cohort, month_offset
        `),
      ]);

      const monthlyMRR = (mrrResult.rows as any[]).map((row) => {
        const monthlyCount = Number(row.monthly_count || 0);
        const annualCount = Number(row.annual_count || 0);
        const mrr = monthlyCount * STANDARD_MONTHLY_CENTS + Math.round((annualCount * STANDARD_ANNUAL_CENTS) / 12);
        return { month: row.month as string, mrr };
      });

      const monthlyChurn = (churnResult.rows as any[]).map((row) => {
        const cancellations = Number(row.cancellations || 0);
        const activeAtStart = Number(row.active_at_start || 0);
        const churnRate = activeAtStart > 0
          ? Math.round((cancellations / activeAtStart) * 10000) / 100
          : 0;
        return {
          month: row.month as string,
          churnRate,
          cancellations,
          activeAtStart,
        };
      });

      const monthlyConversion = (conversionResult.rows as any[]).map((row) => {
        const conversions = Number(row.conversions || 0);
        const trialStarts = Number(row.trial_starts || 0);
        const conversionRate = trialStarts > 0
          ? Math.round((conversions / trialStarts) * 10000) / 100
          : 0;
        return {
          month: row.month as string,
          conversionRate,
          conversions,
          trialStarts,
        };
      });

      const monthlyARPU = (mrrResult.rows as any[]).map((row) => {
        const monthlyCount = Number(row.monthly_count || 0);
        const annualCount = Number(row.annual_count || 0);
        const totalActive = Number(row.total_active || 0);
        const mrr = monthlyCount * STANDARD_MONTHLY_CENTS + Math.round((annualCount * STANDARD_ANNUAL_CENTS) / 12);
        const arpu = totalActive > 0 ? Math.round(mrr / totalActive) : 0;
        return { month: row.month as string, arpu };
      });

      const cohortMap = new Map<string, { totalUsers: number; retention: number[] }>();
      for (const row of cohortResult.rows as any[]) {
        const cohort = row.cohort as string;
        const totalUsers = Number(row.total_users || 0);
        const monthOffset = Number(row.month_offset);
        const retainedUsers = Number(row.retained_users || 0);

        if (!cohortMap.has(cohort)) {
          cohortMap.set(cohort, { totalUsers, retention: [] });
        }
        const entry = cohortMap.get(cohort)!;
        const retentionPct = totalUsers > 0
          ? Math.round((retainedUsers / totalUsers) * 10000) / 100
          : 0;
        entry.retention[monthOffset] = retentionPct;
      }

      const cohortRetention = Array.from(cohortMap.entries()).map(([cohort, data]) => ({
        cohort,
        retention: data.retention,
      }));

      return {
        monthlyMRR,
        monthlyChurn,
        monthlyConversion,
        monthlyARPU,
        cohortRetention,
      };
    });

    res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
});

export default router;
