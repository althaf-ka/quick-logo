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
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable");
}

export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new PipelineError("Operation timed out", true)),
        timeoutMs,
      ),
    ),
  ]);
}

/**
 * Executes a Promise-based operation with a timeout and fallback value.
 * Logs if the operation fails or times out.
 */
export async function generateWithFallback<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  timeoutMs: number,
  loggerPrefix: string,
): Promise<T> {
  const opPromise = operation().catch((error) => {
    console.error(`[${loggerPrefix}] Operation failed:`, error);
    return fallbackValue;
  });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[${loggerPrefix}] Operation timed out; using fallback`);
      resolve(fallbackValue);
    }, timeoutMs);
  });

  try {
    return await Promise.race([opPromise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
