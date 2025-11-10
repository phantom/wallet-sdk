import { getSecureTimestamp, getSecureTimestampSync, __clearTimeCache } from "./time";

// Mock fetch globally
global.fetch = jest.fn();

// Set test environment
process.env.NODE_ENV = "test";

describe("TimeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearTimeCache();
  });

  describe("now()", () => {
    it("should fetch timestamp from API", async () => {
      const mockTimestamp = 1234567890;
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockTimestamp.toString()),
      });

      const result = await getSecureTimestamp();

      expect(fetch).toHaveBeenCalledWith("https://time.phantom.app/utc");
      expect(result).toBe(mockTimestamp);
    });

    it("should use cached timestamp when available", async () => {
      const mockTimestamp = 1234567890;
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockTimestamp.toString()),
      });

      // First call
      await getSecureTimestamp();

      // Second call should use cache
      const result = await getSecureTimestamp();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toBeGreaterThanOrEqual(mockTimestamp);
    });

    it("should fall back to Date.now() when API fails", async () => {
      const originalDateNow = Date.now;
      const mockLocalTime = 9876543210;
      Date.now = jest.fn(() => mockLocalTime);

      (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await getSecureTimestamp();

      expect(result).toBe(mockLocalTime);

      Date.now = originalDateNow;
    });

    it("should fall back to Date.now() when API returns non-ok status", async () => {
      const originalDateNow = Date.now;
      const mockLocalTime = 9876543210;
      Date.now = jest.fn(() => mockLocalTime);

      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await getSecureTimestamp();

      expect(result).toBe(mockLocalTime);

      Date.now = originalDateNow;
    });

    it("should fall back to Date.now() when API returns invalid timestamp", async () => {
      const originalDateNow = Date.now;
      const mockLocalTime = 9876543210;
      Date.now = jest.fn(() => mockLocalTime);

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("invalid-timestamp"),
      });

      const result = await getSecureTimestamp();

      expect(result).toBe(mockLocalTime);

      Date.now = originalDateNow;
    });
  });

  describe("nowSync()", () => {
    it("should return cached timestamp when available", async () => {
      const mockTimestamp = 1234567890;
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockTimestamp.toString()),
      });

      // Populate cache
      await getSecureTimestamp();

      // Use sync version
      const result = getSecureTimestampSync();

      expect(result).toBeGreaterThanOrEqual(mockTimestamp);
    });

    it("should fall back to Date.now() when no cache", () => {
      const originalDateNow = Date.now;
      const mockLocalTime = 9876543210;
      Date.now = jest.fn(() => mockLocalTime);

      const result = getSecureTimestampSync();

      expect(result).toBe(mockLocalTime);

      Date.now = originalDateNow;
    });
  });

  describe("convenience functions", () => {
    it("should export getSecureTimestamp", async () => {
      const mockTimestamp = 1234567890;
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockTimestamp.toString()),
      });

      const result = await getSecureTimestamp();
      expect(result).toBe(mockTimestamp);
    });

    it("should export getSecureTimestampSync", () => {
      const originalDateNow = Date.now;
      const mockLocalTime = 9876543210;
      Date.now = jest.fn(() => mockLocalTime);

      const result = getSecureTimestampSync();
      expect(result).toBe(mockLocalTime);

      Date.now = originalDateNow;
    });
  });
});
