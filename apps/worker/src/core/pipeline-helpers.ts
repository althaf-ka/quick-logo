import { clearTimeout, setTimeout as safeTimeout } from "node:timers";
import { setTimeout } from "node:timers/promises";
import { PipelineError } from "./errors";
import { createLogger } from "@quicklogo/server-telemetry";

const logger = createLogger("worker");

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
 * Runs a Promise-based operation with a timeout, returning `undefined` on
 * failure or timeout instead of throwing. Unlike a silent fallback, the caller
 * can detect the `undefined` and both (a) substitute its own fallback URL and
 * (b) record the failure for partial-refund accounting.
 */
export async function runAssetOrNull<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  loggerPrefix: string,
): Promise<T | undefined> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof safeTimeout> | undefined;

  const timeoutPromise = new Promise<undefined>((resolve) => {
    timeoutId = safeTimeout(() => {
      controller.abort();
      logger.warn(
        `[${loggerPrefix}] Operation timed out (${timeoutMs}ms); marking asset failed`,
      );
      resolve(undefined);
    }, timeoutMs);
  });

  const opPromise = operation(controller.signal)
    .then((result) => {
      if (timeoutId) clearTimeout(timeoutId);
      return result;
    })
    .catch((error) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (controller.signal.aborted) {
        return undefined;
      }
      logger.error(`[${loggerPrefix}] Operation failed:`, error);
      return undefined;
    });

  return Promise.race([opPromise, timeoutPromise]);
}
