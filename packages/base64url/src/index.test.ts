import { base64urlEncode, base64urlDecode, base64urlDecodeToString, stringToBase64url } from "./index";

describe("@phantom/base64url", () => {
  describe("base64urlEncode", () => {
    it("should encode string to base64url", () => {
      const result = base64urlEncode("Hello World");
      expect(result).toBe("SGVsbG8gV29ybGQ");
      // Should not contain base64 special chars
      expect(result).not.toContain("+");
      expect(result).not.toContain("/");
      expect(result).not.toContain("=");
    });

    it("should encode Uint8Array to base64url", () => {
      const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = base64urlEncode(input);
      expect(result).toBe("SGVsbG8");
    });

    it("should handle empty input", () => {
      expect(base64urlEncode("")).toBe("");
      expect(base64urlEncode(new Uint8Array([]))).toBe("");
    });

    it("should replace base64 chars with base64url chars", () => {
      // Test data that produces + and / in standard base64
      const input = new Uint8Array([62, 63, 64]);
      const result = base64urlEncode(input);
      expect(result).not.toContain("+");
      expect(result).not.toContain("/");
      expect(result).not.toContain("=");
    });

    it("should handle ArrayLike input", () => {
      const input = [72, 101, 108, 108, 111]; // "Hello" as array
      const result = base64urlEncode(input);
      expect(result).toBe("SGVsbG8");
    });
  });

  describe("base64urlDecode", () => {
    it("should decode base64url to Uint8Array", () => {
      const result = base64urlDecode("SGVsbG8gV29ybGQ");
      const expected = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]); // "Hello World"
      expect(result).toEqual(expected);
    });

    it("should handle empty string", () => {
      const result = base64urlDecode("");
      expect(result).toEqual(new Uint8Array([]));
    });

    it("should handle base64url with no padding", () => {
      const result = base64urlDecode("SGVsbG8");
      const expected = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      expect(result).toEqual(expected);
    });

    it("should handle base64url special chars", () => {
      // Test string that would have + and / in base64
      const encoded = base64urlEncode("???>"); // This creates + and / in base64
      const decoded = base64urlDecode(encoded);
      expect(decoded).toEqual(new Uint8Array([63, 63, 63, 62]));
    });
  });

  describe("base64urlDecodeToString", () => {
    it("should decode base64url to string", () => {
      const result = base64urlDecodeToString("SGVsbG8gV29ybGQ");
      expect(result).toBe("Hello World");
    });

    it("should handle empty string", () => {
      const result = base64urlDecodeToString("");
      expect(result).toBe("");
    });

    it("should handle Unicode characters", () => {
      const original = "Hello 🌍 World";
      const encoded = stringToBase64url(original);
      const result = base64urlDecodeToString(encoded);
      expect(result).toBe(original);
    });
  });

  describe("stringToBase64url", () => {
    it("should encode string to base64url", () => {
      const result = stringToBase64url("Hello World");
      expect(result).toBe("SGVsbG8gV29ybGQ");
    });

    it("should handle empty string", () => {
      const result = stringToBase64url("");
      expect(result).toBe("");
    });

    it("should handle Unicode characters", () => {
      const input = "Hello 🌍";
      const result = stringToBase64url(input);
      expect(result).toMatch(/^[A-Za-z0-9_-]*$/);

      // Should be decodable back to original
      const decoded = base64urlDecodeToString(result);
      expect(decoded).toBe(input);
    });

    it("should handle JSON strings", () => {
      const input = JSON.stringify({ key: "value", number: 42, bool: true });
      const result = stringToBase64url(input);
      expect(result).toMatch(/^[A-Za-z0-9_-]*$/);

      const decoded = base64urlDecodeToString(result);
      expect(decoded).toBe(input);
    });
  });

  describe("roundtrip encoding/decoding", () => {
    const testCases = [
      "Hello World",
      "Simple test",
      '{"key":"value"}',
      '{"publicKey":"AQIDBAU","signature":"BgcICQo","kind":"PKI"}',
      "",
      "Special chars: !@#$%^&*()",
      "Unicode: 🚀💯🌟",
      "Multi-line\ntext\twith\ttabs",
      "A".repeat(1000), // Long string
    ];

    it("should encode and decode strings correctly", () => {
      testCases.forEach(str => {
        const encoded = stringToBase64url(str);
        const decoded = base64urlDecodeToString(encoded);
        expect(decoded).toBe(str);
      });
    });

    it("should encode and decode Uint8Arrays correctly", () => {
      const testArrays = [
        new Uint8Array([0, 1, 2, 3, 4, 5]),
        new Uint8Array([255, 254, 253]),
        new Uint8Array([62, 63, 64, 65]), // Will produce + and / in standard base64
        new Uint8Array(256).map((_, i) => i), // All possible byte values
      ];

      testArrays.forEach(arr => {
        const encoded = base64urlEncode(arr);
        const decoded = base64urlDecode(encoded);
        expect(decoded).toEqual(arr);
      });
    });

    it("should produce valid base64url format", () => {
      testCases.forEach(str => {
        const result = stringToBase64url(str);
        // Should only contain base64url characters
        expect(result).toMatch(/^[A-Za-z0-9_-]*$/);
        // Should not contain standard base64 padding or special chars
        expect(result).not.toContain("+");
        expect(result).not.toContain("/");
        expect(result).not.toContain("=");
      });
    });
  });

  describe("compatibility with existing implementations", () => {
    // Test cases that should match existing behavior
    it("should match browser-sdk base64url behavior", () => {
      const testString = "Hello from Phantom!";
      const result = stringToBase64url(testString);
      expect(result).toBe("SGVsbG8gZnJvbSBQaGFudG9tIQ");
    });

    it("should handle JWT-like payloads", () => {
      const payload = JSON.stringify({
        sub: "1234567890",
        name: "John Doe",
        iat: 1516239022,
      });

      const encoded = stringToBase64url(payload);
      const decoded = base64urlDecodeToString(encoded);
      expect(JSON.parse(decoded)).toEqual(JSON.parse(payload));
    });
  });
});
