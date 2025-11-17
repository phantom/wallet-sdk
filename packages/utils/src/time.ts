/**
 * Secure time service that fetches server time from Phantom's time API
 * instead of relying on local machine time which can be manipulated
 */

class TimeService {
  private static instance: TimeService;
  private cache: { timestamp: number; fetchedAt: number } | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds cache
  private readonly TIME_API_URL = "https://time.phantom.app/utc";

  private constructor() {}

  static getInstance(): TimeService {
    if (!TimeService.instance) {
      TimeService.instance = new TimeService();
    }
    return TimeService.instance;
  }

  /**
   * Get current timestamp from Phantom's secure time API
   * Includes basic caching to reduce API calls
   */
  async now(): Promise<number> {
    const now = Date.now();

    // Use cache if it's fresh (within CACHE_DURATION)
    if (this.cache && now - this.cache.fetchedAt < this.CACHE_DURATION) {
      // Adjust cached timestamp by elapsed time
      const elapsed = now - this.cache.fetchedAt;
      return this.cache.timestamp + elapsed;
    }

    try {
      const response = await fetch(this.TIME_API_URL);
      if (!response.ok) {
        throw new Error(`Time API responded with status: ${response.status}`);
      }

      const timestampText = await response.text();
      const timestamp = parseInt(timestampText, 10);

      if (isNaN(timestamp)) {
        throw new Error(`Invalid timestamp received: ${timestampText}`);
      }

      // Cache the result
      this.cache = {
        timestamp,
        fetchedAt: now,
      };

      return timestamp;
    } catch (error) {
      // Fallback to Date.now() if the time service is unavailable
      return Date.now();
    }
  }

  /**
   * Synchronous version that uses cached time if available,
   * otherwise falls back to Date.now()
   */
  nowSync(): number {
    if (this.cache) {
      const elapsed = Date.now() - this.cache.fetchedAt;
      if (elapsed < this.CACHE_DURATION) {
        return this.cache.timestamp + elapsed;
      }
    }
    return Date.now();
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache = null;
  }
}

// Create singleton instance
const timeService = TimeService.getInstance();

// Convenience functions for getting secure timestamp
export const getSecureTimestamp = () => timeService.now();
export const getSecureTimestampSync = () => timeService.nowSync();

// Test helper - only export in test environments
export const __clearTimeCache = () => {
  if (process.env.NODE_ENV === "test") {
    timeService.clearCache();
  }
};
