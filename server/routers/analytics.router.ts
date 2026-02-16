import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { userWasteLogs, userConsumedLogs, userSyncKV } from "@shared/schema";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";
import { logger } from "../lib/logger";

const router = Router();

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calcWasteScore(wasteCount: number, totalItems: number): number {
  return Math.round(100 - (wasteCount / Math.max(1, totalItems)) * 100);
}

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const period = (req.query.period as string) || "month";
    const weeks = parseInt(req.query.weeks as string) || 12;

    const now = new Date();
    let periodStart: string;
    let periodEnd: string;
    let periodLabel: string;

    if (period === "week") {
      const monday = getMonday(now);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      periodStart = formatDate(monday);
      periodEnd = formatDate(sunday);
      periodLabel = "This Week";
    } else {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      periodStart = formatDate(firstDay);
      periodEnd = formatDate(lastDay);
      periodLabel = "This Month";
    }

    const [wasteResult] = await db
      .select({ value: count() })
      .from(userWasteLogs)
      .where(
        and(
          eq(userWasteLogs.userId, userId),
          gte(userWasteLogs.date, periodStart),
          lte(userWasteLogs.date, periodEnd)
        )
      );

    const [consumedResult] = await db
      .select({ value: count() })
      .from(userConsumedLogs)
      .where(
        and(
          eq(userConsumedLogs.userId, userId),
          gte(userConsumedLogs.date, periodStart),
          lte(userConsumedLogs.date, periodEnd)
        )
      );

    const wasteCount = Number(wasteResult?.value ?? 0);
    const consumedCount = Number(consumedResult?.value ?? 0);
    const totalItems = wasteCount + consumedCount;
    const wasteScore = calcWasteScore(wasteCount, totalItems);

    const currentPeriod = {
      wasteCount,
      consumedCount,
      totalItems,
      wasteScore,
      periodLabel,
    };

    const weeksAgo = new Date(now);
    weeksAgo.setDate(weeksAgo.getDate() - weeks * 7);
    const trendStart = formatDate(getMonday(weeksAgo));

    const wasteTrends = await db
      .select({
        weekStart: sql<string>`date_trunc('week', ${userWasteLogs.date}::date)::text`,
        count: count(),
      })
      .from(userWasteLogs)
      .where(
        and(
          eq(userWasteLogs.userId, userId),
          gte(userWasteLogs.date, trendStart)
        )
      )
      .groupBy(sql`date_trunc('week', ${userWasteLogs.date}::date)`);

    const consumedTrends = await db
      .select({
        weekStart: sql<string>`date_trunc('week', ${userConsumedLogs.date}::date)::text`,
        count: count(),
      })
      .from(userConsumedLogs)
      .where(
        and(
          eq(userConsumedLogs.userId, userId),
          gte(userConsumedLogs.date, trendStart)
        )
      )
      .groupBy(sql`date_trunc('week', ${userConsumedLogs.date}::date)`);

    const wasteByWeek = new Map<string, number>();
    for (const row of wasteTrends) {
      const key = row.weekStart.split(" ")[0];
      wasteByWeek.set(key, Number(row.count));
    }

    const consumedByWeek = new Map<string, number>();
    for (const row of consumedTrends) {
      const key = row.weekStart.split(" ")[0];
      consumedByWeek.set(key, Number(row.count));
    }

    const trends: Array<{
      weekStart: string;
      wasteCount: number;
      consumedCount: number;
      wasteScore: number;
    }> = [];

    const mondayOfCurrent = getMonday(now);
    for (let i = weeks - 1; i >= 0; i--) {
      const weekDate = new Date(mondayOfCurrent);
      weekDate.setDate(weekDate.getDate() - i * 7);
      const key = formatDate(weekDate);
      const wc = wasteByWeek.get(key) || 0;
      const cc = consumedByWeek.get(key) || 0;
      const total = wc + cc;
      trends.push({
        weekStart: key,
        wasteCount: wc,
        consumedCount: cc,
        wasteScore: calcWasteScore(wc, total),
      });
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let streakBroken = false;

    for (let i = trends.length - 1; i >= 0; i--) {
      const t = trends[i];
      if (t.wasteScore >= 80) {
        tempStreak++;
        if (!streakBroken) {
          currentStreak = tempStreak;
        }
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 0;
        streakBroken = true;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    const lastUpdated = new Date().toISOString();
    const streakData = { currentStreak, longestStreak, lastUpdated };

    await db
      .insert(userSyncKV)
      .values({
        userId,
        section: "analytics",
        data: streakData,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userSyncKV.userId, userSyncKV.section],
        set: {
          data: streakData,
          updatedAt: new Date(),
        },
      });

    res.json(
      successResponse({
        currentPeriod,
        trends,
        streak: {
          currentStreak,
          longestStreak,
          lastUpdated,
        },
      })
    );
  } catch (error) {
    logger.error("Analytics waste summary error", {
      error: error instanceof Error ? error.message : String(error),
    });
    next(error);
  }
});

export default router;
