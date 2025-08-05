import type { DebugLogger } from "../interfaces";

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string,
  logger: DebugLogger,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.log("EMBEDDED_PROVIDER", `Attempting ${operationName}`, {
        attempt,
        maxRetries,
      });
      return await operation();
    } catch (error) {
      lastError = error as Error;
      logger.warn("EMBEDDED_PROVIDER", `${operationName} failed`, {
        attempt,
        maxRetries,
        error: error instanceof Error ? error.message : String(error),
      });

      if (attempt === maxRetries) {
        logger.error("EMBEDDED_PROVIDER", `${operationName} failed after ${maxRetries} attempts`, {
          finalError: error instanceof Error ? error.message : String(error),
        });
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.log("EMBEDDED_PROVIDER", `Retrying ${operationName} in ${delay}ms`, {
        attempt: attempt + 1,
        delay,
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
