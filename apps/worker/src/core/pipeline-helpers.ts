import { clearTimeout, setTimeout as safeTimeout } from "node:timers";
import { setTimeout } from "node:timers/promises";
import { PipelineError } from "./errors";

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      const retryable = error instanceof PipelineError ? error.retryable : true;
      if (!retryable || attempt >= maxRetries) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      // Wait for the delay
      await setTimeout(delay);
    }
  }
  throw new Error("Unreachable");
}

export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof safeTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = safeTimeout(
      () => reject(new PipelineError("Operation timed out", true)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([operation(), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Executes a Promise-based operation with a timeout and fallback value using AbortController.
 * Logs if the operation fails or times out.
 */
export async function generateWithFallback<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  timeoutMs: number,
  loggerPrefix: string,
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof safeTimeout> | undefined;

  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = safeTimeout(() => {
      controller.abort();
      console.warn(
        `[${loggerPrefix}] Operation timed out (${timeoutMs}ms); using fallback`,
      );
      resolve(fallbackValue);
    }, timeoutMs);
  });

  const opPromise = operation()
    .then((result) => {
      if (timeoutId) clearTimeout(timeoutId);
      return result;
    })
    .catch((error) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (controller.signal.aborted) {
        return fallbackValue;
      }
      console.error(`[${loggerPrefix}] Operation failed:`, error);
      return fallbackValue;
    });

  return Promise.race([opPromise, timeoutPromise]);
}
