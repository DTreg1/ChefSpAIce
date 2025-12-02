import { Request, Response, NextFunction } from "express";

/**
 * Date Range Filtering Utility
 *
 * Shared utility for parsing and validating date range query parameters
 * across different routers (activity logs, analytics, etc.)
 *
 * Features:
 * - Consistent date parsing
 * - Validation with reasonable defaults
 * - Timezone handling
 * - Error handling with clear messages
 */

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

// Extend Express Request to include dateRange
declare module "express-serve-static-core" {
  interface Request {
    dateRange?: DateRangeFilter;
  }
}

export interface DateRangeOptions {
  defaultDays?: number; // Default number of days to look back if no startDate provided
  maxDays?: number; // Maximum allowed date range
  requireDates?: boolean; // Whether to require at least one date
}

/**
 * Parse date range from request query parameters
 *
 * @param req - Express request object
 * @param options - Configuration options for date parsing
 * @returns Parsed and validated date range
 */
export function parseDateRange(
  req: Request,
  options: DateRangeOptions = {},
): DateRangeFilter {
  const { defaultDays = 30, maxDays = 365, requireDates = false } = options;

  const filter: DateRangeFilter = {};

  // Parse start date
  if (req.query.startDate) {
    const startDate = parseDate(req.query.startDate as string);
    if (!startDate) {
      throw new Error(
        "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)",
      );
    }
    filter.startDate = startDate;
  }

  // Parse end date
  if (req.query.endDate) {
    const endDate = parseDate(req.query.endDate as string);
    if (!endDate) {
      throw new Error(
        "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)",
      );
    }
    // If only time is provided, set to end of day
    if (!req.query.endDate.toString().includes("T")) {
      endDate.setHours(23, 59, 59, 999);
    }
    filter.endDate = endDate;
  }

  // Apply defaults if no dates provided
  if (!filter.startDate && !filter.endDate && requireDates) {
    throw new Error(
      "At least one date parameter (startDate or endDate) is required",
    );
  }

  // If only endDate provided, default startDate to defaultDays before endDate
  if (!filter.startDate && filter.endDate) {
    filter.startDate = new Date(
      filter.endDate.getTime() - defaultDays * 24 * 60 * 60 * 1000,
    );
  }

  // If only startDate provided, default endDate to now
  if (filter.startDate && !filter.endDate) {
    filter.endDate = new Date();
  }

  // Validate date range
  if (filter.startDate && filter.endDate) {
    if (filter.startDate > filter.endDate) {
      throw new Error("startDate cannot be after endDate");
    }

    // Check max range
    const daysDiff = Math.ceil(
      (filter.endDate.getTime() - filter.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysDiff > maxDays) {
      throw new Error(`Date range cannot exceed ${maxDays} days`);
    }
  }

  return filter;
}

/**
 * Parse date string to Date object
 * Supports various formats:
 * - ISO 8601: 2024-01-15 or 2024-01-15T10:30:00
 * - Unix timestamp: 1705325400000
 *
 * @param dateStr - Date string to parse
 * @returns Parsed Date object or null if invalid
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try parsing as number (Unix timestamp)
  if (/^\d+$/.test(dateStr)) {
    const timestamp = parseInt(dateStr, 10);
    const date = new Date(timestamp);
    return isValidDate(date) ? date : null;
  }

  // Try parsing as ISO string
  const date = new Date(dateStr);
  return isValidDate(date) ? date : null;
}

/**
 * Check if a date is valid
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Format date range for logging or display
 */
export function formatDateRange(filter: DateRangeFilter): string {
  if (!filter.startDate && !filter.endDate) {
    return "All time";
  }

  const start = filter.startDate
    ? filter.startDate.toISOString().split("T")[0]
    : "Beginning";
  const end = filter.endDate
    ? filter.endDate.toISOString().split("T")[0]
    : "Now";

  return `${start} to ${end}`;
}

/**
 * Get date range for specific presets
 */
export function getPresetDateRange(
  preset: "today" | "week" | "month" | "quarter" | "year",
): DateRangeFilter {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  const quarter = Math.floor(now.getMonth() / 3);

  switch (preset) {
    case "today":
      return {
        startDate: startOfDay,
        endDate: now,
      };

    case "week":
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      return {
        startDate: startOfWeek,
        endDate: now,
      };

    case "month":
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: now,
      };

    case "quarter":
      return {
        startDate: new Date(now.getFullYear(), quarter * 3, 1),
        endDate: now,
      };

    case "year":
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: now,
      };

    default:
      return {};
  }
}

/**
 * Middleware to parse and attach date range to request
 */
export function dateRangeMiddleware(options: DateRangeOptions = {}) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.dateRange = parseDateRange(req, options);
      next();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      next(new Error(`Date range error: ${errorMessage}`));
    }
  };
}
