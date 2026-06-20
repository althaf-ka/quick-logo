export type LogLevel = "info" | "warn" | "error" | "fatal";
export type LogSource = "web" | "admin" | "api";

export interface TelemetryEvent {
  level: LogLevel;
  source: LogSource;
  message: string;
  stack?: string;
  pathname?: string;
  context?: Record<string, unknown>;
}

const REPORT_URL = "/api/logs/report";

/**
 * Standard telemetry reporter for frontend applications.
 */
export const telemetry = {
  async report(event: TelemetryEvent) {
    try {
      const enrichedEvent = {
        ...event,
        pathname: event.pathname || window.location.pathname,
        context: {
          ...event.context,
          href: window.location.href,
          screen: `${window.screen.width}x${window.screen.height}`,
          language: navigator.language,
        },
      };

      // Use sendBeacon for reliable delivery on page unload if needed,
      // but fetch is better for structured JSON reports.
      await fetch(REPORT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(enrichedEvent),
      });
    } catch (err) {
      // Fail silently to avoid infinite error loops
      console.error("Critical: Telemetry failed to report event", err);
    }
  },

  info(source: LogSource, message: string, context?: Record<string, unknown>) {
    return this.report({ level: "info", source, message, context });
  },

  warn(source: LogSource, message: string, context?: Record<string, unknown>) {
    return this.report({ level: "warn", source, message, context });
  },

  error(source: LogSource, message: string, stack?: string, context?: Record<string, unknown>) {
    return this.report({ level: "error", source, message, stack, context });
  },

  fatal(source: LogSource, message: string, stack?: string, context?: Record<string, unknown>) {
    return this.report({ level: "fatal", source, message, stack, context });
  },
};

/**
 * Global error handler initialization
 */
export const initGlobalMonitoring = (source: LogSource) => {
  if (typeof window === "undefined") return;

  window.onerror = (message, sourceFile, lineno, colno, error) => {
    telemetry.error(
      source,
      typeof message === "string" ? message : "Global Error",
      error?.stack,
      {
        sourceFile,
        lineno,
        colno,
      },
    );
  };

  window.onunhandledrejection = (event) => {
    telemetry.fatal(
      source,
      "Unhandled Promise Rejection",
      String(event.reason),
      {
        reason: event.reason,
      },
    );
  };
};
