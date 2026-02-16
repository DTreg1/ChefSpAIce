export type LogContext = Record<string, unknown>;

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  context?: LogContext;
}

const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};

const RESET = "\x1b[0m";

const isProduction = process.env.NODE_ENV === "production";

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const configuredLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
const minLevel = LOG_LEVEL_ORDER[configuredLevel] ?? LOG_LEVEL_ORDER.info;

function formatEntry(level: LogLevel, message: string, context?: LogContext): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context?.requestId !== undefined) {
    entry.requestId = context.requestId as string;
  }

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (isProduction) {
    return JSON.stringify(entry);
  }

  const color = COLORS[level];
  const prefix = `${color}[${level.toUpperCase()}]${RESET}`;
  const contextStr = context && Object.keys(context).length > 0
    ? ` ${color}${JSON.stringify(context, null, 2)}${RESET}`
    : "";
  return `${prefix} ${message}${contextStr}`;
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  if (LOG_LEVEL_ORDER[level] < minLevel) return;
  const output = formatEntry(level, message, context);
  switch (level) {
    case "debug":
      console.debug(output);
      break;
    case "info":
      console.info(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "error":
      console.error(output);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
};
