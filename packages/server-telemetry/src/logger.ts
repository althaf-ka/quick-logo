import { systemLogs } from "@quicklogo/db";
import type { Database } from "@quicklogo/db";

type LogLevel = "info" | "warn" | "error" | "fatal";
type LogSource = "api" | "worker" | "ai-providers" | "web" | "admin";

export interface LoggerOptions {
  db?: Database;
}

class ServerLogger {
  private source: LogSource;
  private options?: LoggerOptions;

  constructor(source: LogSource, options?: LoggerOptions) {
    this.source = source;
    this.options = options;
  }

  private formatStdout(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    err?: unknown,
  ) {
    const timestamp = new Date().toISOString();

    const outputContext: any = { ...context };
    if (err) {
      outputContext.error = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.stack) {
        outputContext.stack = err.stack;
      }
    }

    return JSON.stringify({
      timestamp,
      level,
      source: this.source,
      message,
      context:
        Object.keys(outputContext).length > 0 ? outputContext : undefined,
    });
  }

  private async persist(
    level: "warn" | "error" | "fatal",
    message: string,
    context?: Record<string, unknown>,
    err?: unknown,
  ) {
    if (!this.options?.db) return;

    let stack: string | undefined;
    const finalContext = { ...context };
    const pathname =
      typeof finalContext.pathname === "string" ? finalContext.pathname : null;
    const userId =
      typeof finalContext.userId === "string" ? finalContext.userId : null;
    delete finalContext.pathname;
    delete finalContext.userId;

    if (err instanceof Error) {
      stack = err.stack;
      finalContext.errorMessage = err.message;
    } else if (err) {
      finalContext.error = String(err);
    }

    try {
      // Fire and forget insert
      const insertPromise = this.options.db.insert(systemLogs).values({
        level,
        source: this.source,
        message,
        stack: stack ?? null,
        pathname,
        userId,
        context:
          Object.keys(finalContext).length > 0
            ? JSON.stringify(finalContext)
            : null,
        status: "unresolved",
      });

      // If we are in Cloudflare Workers environment, we should try to use ctx.waitUntil if available.
      // But typically, simply awaiting or firing works. In a robust setup, the caller would pass ctx
      // or we just await it (which might delay response slightly but ensures delivery).
      // For now, we will just fire the promise and catch any errors.
      insertPromise.catch((dbErr: unknown) => {
        console.error(
          `[TELEMETRY FAILURE] Failed to insert log to DB: ${String(dbErr)}`,
        );
      });
    } catch (dbErr) {
      console.error(
        `[TELEMETRY FAILURE] Failed to prepare DB insert: ${String(dbErr)}`,
      );
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    console.info(this.formatStdout("info", message, context));
  }

  warn(message: string, context?: Record<string, unknown>, err?: unknown) {
    console.warn(this.formatStdout("warn", message, context, err));
    this.persist("warn", message, context, err);
  }

  error(message: string, err?: unknown, context?: Record<string, unknown>) {
    console.error(this.formatStdout("error", message, context, err));
    this.persist("error", message, context, err);
  }

  fatal(message: string, err?: unknown, context?: Record<string, unknown>) {
    console.error(this.formatStdout("fatal", message, context, err));
    this.persist("fatal", message, context, err);
  }
}

export function createLogger(source: LogSource, options?: LoggerOptions) {
  return new ServerLogger(source, options);
}
