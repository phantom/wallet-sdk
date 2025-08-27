/**
 * Unit tests for browser detection core parsing logic
 */

import { parseBrowserFromUserAgent, detectBrowser, getPlatformName, getBrowserDisplayName } from "./browser-detection";

describe("Browser Detection", () => {
  describe("parseBrowserFromUserAgent", () => {
    it("should detect Chrome correctly", () => {
      const userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const result = parseBrowserFromUserAgent(userAgent);
      expect(result.name).toBe("chrome");
      expect(result.version).toBe("120");
    });

    it("should detect Firefox correctly", () => {
      const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0";
      const result = parseBrowserFromUserAgent(userAgent);
      expect(result.name).toBe("firefox");
      expect(result.version).toBe("119");
    });

    it("should detect Safari correctly", () => {
      const userAgent =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
      const result = parseBrowserFromUserAgent(userAgent);
      expect(result.name).toBe("safari");
      expect(result.version).toBe("17");
    });

    it("should detect Edge correctly", () => {
      const userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
      const result = parseBrowserFromUserAgent(userAgent);
      expect(result.name).toBe("edge");
      expect(result.version).toBe("120");
    });

    it("should detect Opera correctly", () => {
      const userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0";
      const result = parseBrowserFromUserAgent(userAgent);
      expect(result.name).toBe("opera");
      expect(result.version).toBe("106");
    });

    it("should detect Samsung Internet correctly", () => {
      const userAgent =
        "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36";
      const result = parseBrowserFromUserAgent(userAgent);
      expect(result.name).toBe("samsung");
      expect(result.version).toBe("23");
    });

    it("should detect Brave correctly with brave API flag", () => {
      const userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const result = parseBrowserFromUserAgent(userAgent, true); // hasBraveAPI = true
      expect(result.name).toBe("brave");
      expect(result.version).toBe("120");
    });

    it("should detect Chrome Mobile correctly", () => {
      const userAgent =
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
      const result = parseBrowserFromUserAgent(userAgent);
      expect(result.name).toBe("chrome-mobile");
      expect(result.version).toBe("120");
    });

    it("should detect Safari Mobile correctly", () => {
      const userAgent =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
      const result = parseBrowserFromUserAgent(userAgent);
      expect(result.name).toBe("safari-mobile");
      expect(result.version).toBe("17");
    });

    it("should handle empty user agent", () => {
      const result = parseBrowserFromUserAgent("");
      expect(result.name).toBe("unknown");
      expect(result.version).toBe("unknown");
    });

    it("should handle null/undefined user agent", () => {
      expect(parseBrowserFromUserAgent(null as any).name).toBe("unknown");
      expect(parseBrowserFromUserAgent(undefined as any).name).toBe("unknown");
    });

    it("should handle unknown browser gracefully", () => {
      const userAgent = "SomeUnknownBrowser/1.0";
      const result = parseBrowserFromUserAgent(userAgent);
      expect(result.name).toBe("unknown");
      expect(result.version).toBe("unknown");
    });

    it("should prioritize Edge over Chrome when Edg/ is present", () => {
      const userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
      const result = parseBrowserFromUserAgent(userAgent);
      expect(result.name).toBe("edge");
      expect(result.version).toBe("120");
    });

    it("should extract only major version number", () => {
      const userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.1.2.3 Safari/537.36";
      const result = parseBrowserFromUserAgent(userAgent);
      expect(result.name).toBe("chrome");
      expect(result.version).toBe("120"); // Should be major version only
    });
  });

  describe("detectBrowser (integration)", () => {
    it("should handle no window object (Node.js environment)", () => {
      // This test runs in Node.js environment where window is undefined
      const result = detectBrowser();
      expect(result.name).toBe("unknown");
      expect(result.version).toBe("unknown");
    });
  });

  describe("getPlatformName", () => {
    it("should return unknown in Node.js environment", () => {
      const platformName = getPlatformName();
      expect(platformName).toBe("unknown");
    });
  });

  describe("getBrowserDisplayName", () => {
    it("should return Unknown in Node.js environment", () => {
      const displayName = getBrowserDisplayName();
      expect(displayName).toBe("Unknown");
    });
  });
});
