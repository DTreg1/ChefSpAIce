import * as Sentry from "@sentry/node";
import { logger } from "./logger";

let initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    logger.warn("No SENTRY_DSN or EXPO_PUBLIC_SENTRY_DSN configured — server-side Sentry disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0.2,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },
  });

  initialized = true;
  logger.info("Sentry initialized for server-side error tracking");
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

export function flush(timeout = 2000): Promise<boolean> {
  if (!initialized) return Promise.resolve(true);
  return Sentry.flush(timeout);
}
