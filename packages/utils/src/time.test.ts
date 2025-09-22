import { timeService, getSecureTimestamp, getSecureTimestampSync } from './time';

// Mock fetch globally
global.fetch = jest.fn();

describe('TimeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    timeService.clearCache();
  });

  describe('now()', () => {
    it('should fetch timestamp from API', async () => {
      const mockTimestamp = 1234567890;
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockTimestamp.toString(),
      });

      const result = await timeService.now();

      expect(fetch).toHaveBeenCalledWith('https://time.phantom.app/utc');
      expect(result).toBe(mockTimestamp);
    });

    it('should use cached timestamp when available', async () => {
      const mockTimestamp = 1234567890;
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockTimestamp.toString(),
      });

      // First call
      await timeService.now();

      // Second call should use cache
      const result = await timeService.now();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toBeGreaterThanOrEqual(mockTimestamp);
    });

    it('should fall back to Date.now() when API fails', async () => {
      const originalDateNow = Date.now;
      const mockLocalTime = 9876543210;
      Date.now = jest.fn(() => mockLocalTime);

      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await timeService.now();

      expect(result).toBe(mockLocalTime);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch secure time, falling back to local time:',
        expect.any(Error)
      );

      Date.now = originalDateNow;
      consoleSpy.mockRestore();
    });

    it('should fall back to Date.now() when API returns non-ok status', async () => {
      const originalDateNow = Date.now;
      const mockLocalTime = 9876543210;
      Date.now = jest.fn(() => mockLocalTime);

      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await timeService.now();

      expect(result).toBe(mockLocalTime);
      expect(consoleSpy).toHaveBeenCalled();

      Date.now = originalDateNow;
      consoleSpy.mockRestore();
    });

    it('should fall back to Date.now() when API returns invalid timestamp', async () => {
      const originalDateNow = Date.now;
      const mockLocalTime = 9876543210;
      Date.now = jest.fn(() => mockLocalTime);

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => 'invalid-timestamp',
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await timeService.now();

      expect(result).toBe(mockLocalTime);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch secure time, falling back to local time:',
        expect.any(Error)
      );

      Date.now = originalDateNow;
      consoleSpy.mockRestore();
    });
  });

  describe('nowSync()', () => {
    it('should return cached timestamp when available', async () => {
      const mockTimestamp = 1234567890;
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ timestamp: mockTimestamp }),
      });

      // Populate cache
      await timeService.now();

      // Use sync version
      const result = timeService.nowSync();

      expect(result).toBeGreaterThanOrEqual(mockTimestamp);
    });

    it('should fall back to Date.now() when no cache', () => {
      const originalDateNow = Date.now;
      const mockLocalTime = 9876543210;
      Date.now = jest.fn(() => mockLocalTime);

      const result = timeService.nowSync();

      expect(result).toBe(mockLocalTime);

      Date.now = originalDateNow;
    });
  });

  describe('convenience functions', () => {
    it('should export getSecureTimestamp', async () => {
      const mockTimestamp = 1234567890;
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: async () => mockTimestamp.toString(),
      });

      const result = await getSecureTimestamp();
      expect(result).toBe(mockTimestamp);
    });

    it('should export getSecureTimestampSync', () => {
      const originalDateNow = Date.now;
      const mockLocalTime = 9876543210;
      Date.now = jest.fn(() => mockLocalTime);

      const result = getSecureTimestampSync();
      expect(result).toBe(mockLocalTime);

      Date.now = originalDateNow;
    });
  });
});