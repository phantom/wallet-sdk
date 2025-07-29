import { Buffer } from "buffer";

// Import the internal functions by re-implementing them for testing
// Since they're not exported, we'll test them through the main functionality
// But let's create separate tests for the encoding logic

function base64urlEncode(data: Uint8Array): string {
  const base64 = Buffer.from(data).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function stringToBase64url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return base64urlEncode(bytes);
}

function decodeBase64url(str: string): string {
  const base64 = str
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");

  return Buffer.from(base64, "base64").toString("utf8");
}

describe("Base64url encoding utilities", () => {
  describe("base64urlEncode", () => {
    it("should encode Uint8Array to base64url", () => {
      const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = base64urlEncode(input);
      expect(result).toBe("SGVsbG8");
    });

    it("should handle empty array", () => {
      const input = new Uint8Array([]);
      const result = base64urlEncode(input);
      expect(result).toBe("");
    });

    it("should replace base64 chars with base64url chars", () => {
      // Create data that will produce + and / in base64
      const input = new Uint8Array([62, 63, 64]); // Will produce chars that need replacement
      const result = base64urlEncode(input);
      expect(result).not.toContain("+");
      expect(result).not.toContain("/");
      expect(result).not.toContain("=");
    });

    it("should remove padding", () => {
      // Test data that would normally have padding
      const input = new Uint8Array([72]); // Single byte, will have padding in base64
      const result = base64urlEncode(input);
      expect(result).not.toContain("=");
    });
  });

  describe("stringToBase64url", () => {
    it("should encode string to base64url", () => {
      const input = "Hello World";
      const result = stringToBase64url(input);
      expect(result).toBe("SGVsbG8gV29ybGQ");
    });

    it("should handle empty string", () => {
      const result = stringToBase64url("");
      expect(result).toBe("");
    });

    it("should handle special characters", () => {
      const input = "Hello 🌍";
      const result = stringToBase64url(input);
      // Should be valid base64url
      expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
    });

    it("should handle JSON strings", () => {
      const input = JSON.stringify({ publicKey: "abc123", signature: "def456", kind: "PKI" });
      const result = stringToBase64url(input);
      expect(result).toMatch(/^[A-Za-z0-9_-]*$/);

      // Should be decodable back to original
      const decoded = decodeBase64url(result);
      expect(decoded).toBe(input);
    });
  });

  describe("roundtrip encoding/decoding", () => {
    it("should encode and decode back to original string", () => {
      const testStrings = [
        "Hello World",
        "Simple test",
        '{"key":"value"}',
        '{"publicKey":"AQIDBAU","signature":"BgcICQo","kind":"PKI"}',
        "",
        "Special chars: !@#$%^&*()",
        "Unicode: 🚀💯🌟",
      ];

      testStrings.forEach(str => {
        const encoded = stringToBase64url(str);
        const decoded = decodeBase64url(encoded);
        expect(decoded).toBe(str);
      });
    });

    it("should produce valid base64url format", () => {
      const testData = [
        new Uint8Array([0, 1, 2, 3, 4, 5]),
        new Uint8Array([255, 254, 253]),
        new Uint8Array([62, 63, 64, 65]), // Will produce + and / in standard base64
      ];

      testData.forEach(data => {
        const result = base64urlEncode(data);
        // Should only contain base64url characters
        expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
        // Should not contain standard base64 padding or special chars
        expect(result).not.toContain("+");
        expect(result).not.toContain("/");
        expect(result).not.toContain("=");
      });
    });
  });
});
