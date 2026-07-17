import { clearTimeout, setTimeout as safeTimeout } from "node:timers";
import { setTimeout } from "node:timers/promises";
import { PipelineError } from "./errors";
import { createLogger } from "@quicklogo/server-telemetry";
import type {
  AIProvider,
  GenerationParams,
  GenerationResult,
} from "@quicklogo/ai-providers/types";

const logger = createLogger("worker");
const RETRY_AFTER_SAFETY_BUFFER_MS = 1500;

export interface GenerationRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  policy?: "standard" | "safe-only";
}

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

export async function withRetryableGeneration(
  provider: AIProvider,
  params: GenerationParams,
  options: GenerationRetryOptions = {},
): Promise<GenerationResult> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    policy: retryPolicy = "standard",
  } = options;
  let attempt = 0;
  while (attempt < maxAttempts) {
    const result = await provider.generate(params);
    if (result.success) {
      return result;
    }

    if (!result.isRetryable) {
      return result;
    }
    if (retryPolicy === "safe-only" && !result.isSafeToRetry) {
      logger.warn(
        "[ai-providers] Skipping automatic retry because prediction creation is ambiguous",
        { error: result.error, model: result.metadata?.model },
      );
      return result;
    }

    attempt++;
    if (attempt >= maxAttempts) {
      return result;
    }

    const delay = result.retryAfter
      ? result.retryAfter * 1000 + RETRY_AFTER_SAFETY_BUFFER_MS
      : baseDelayMs * Math.pow(2, attempt - 1);

    logger.warn(
      `[ai-providers] Generation failed, retrying after ${delay}ms...`,
      { error: result.error, attempt, retryPolicy },
    );
    try {
      await setTimeout(delay, undefined, { signal: params.signal });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return {
          success: false,
          error: "Aborted during retry delay",
          isRetryable: false,
        };
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
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
