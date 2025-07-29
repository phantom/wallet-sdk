import { base64urlEncode, base64urlDecode, base64urlDecodeToString, stringToBase64url } from "./base64url";

describe("base64url utilities", () => {
  describe("base64urlEncode", () => {
    it("should encode a string to base64url", () => {
      const input = "Hello World!";
      const result = base64urlEncode(input);
      expect(result).toBe("SGVsbG8gV29ybGQh");
    });

    it("should encode a Uint8Array to base64url", () => {
      const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = base64urlEncode(input);
      expect(result).toBe("SGVsbG8");
    });

    it("should encode an array-like object to base64url", () => {
      const input = [72, 101, 108, 108, 111]; // "Hello"
      const result = base64urlEncode(input);
      expect(result).toBe("SGVsbG8");
    });

    it("should remove padding characters", () => {
      const input = "Sure.";
      const result = base64urlEncode(input);
      expect(result).toBe("U3VyZS4");
      expect(result).not.toContain("=");
    });

    it("should replace + with - and / with _", () => {
      // This input produces base64 with + and /
      const input = new Uint8Array([255, 239]);
      const result = base64urlEncode(input);
      expect(result).toBe("_-8");
      expect(result).not.toContain("+");
      expect(result).not.toContain("/");
    });

    it("should handle empty input", () => {
      expect(base64urlEncode("")).toBe("");
      expect(base64urlEncode(new Uint8Array([]))).toBe("");
    });
  });

  describe("base64urlDecode", () => {
    it("should decode base64url to Uint8Array", () => {
      const input = "SGVsbG8gV29ybGQh";
      const result = base64urlDecode(input);
      const expected = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]);
      expect(result).toEqual(expected);
    });

    it("should handle base64url without padding", () => {
      const input = "U3VyZS4";
      const result = base64urlDecode(input);
      const expected = new Uint8Array([83, 117, 114, 101, 46]);
      expect(result).toEqual(expected);
    });

    it("should handle - and _ characters", () => {
      const input = "_-8";
      const result = base64urlDecode(input);
      const expected = new Uint8Array([255, 239]);
      expect(result).toEqual(expected);
    });

    it("should handle empty input", () => {
      const result = base64urlDecode("");
      expect(result).toEqual(new Uint8Array([]));
    });
  });

  describe("base64urlDecodeToString", () => {
    it("should decode base64url directly to string", () => {
      const input = "SGVsbG8gV29ybGQh";
      const result = base64urlDecodeToString(input);
      expect(result).toBe("Hello World!");
    });

    it("should handle UTF-8 characters", () => {
      const original = "你好世界 🌍";
      const encoded = stringToBase64url(original);
      const decoded = base64urlDecodeToString(encoded);
      expect(decoded).toBe(original);
    });

    it("should handle empty input", () => {
      const result = base64urlDecodeToString("");
      expect(result).toBe("");
    });
  });

  describe("stringToBase64url", () => {
    it("should encode string to base64url", () => {
      const input = "Hello World!";
      const result = stringToBase64url(input);
      expect(result).toBe("SGVsbG8gV29ybGQh");
    });

    it("should handle UTF-8 characters", () => {
      const input = "你好世界";
      const result = stringToBase64url(input);
      expect(result).toBe("5L2g5aW95LiW55WM");
    });

    it("should handle emojis", () => {
      const input = "Hello 👋 World 🌍";
      const encoded = stringToBase64url(input);
      const decoded = base64urlDecodeToString(encoded);
      expect(decoded).toBe(input);
    });

    it("should handle empty string", () => {
      const result = stringToBase64url("");
      expect(result).toBe("");
    });
  });

  describe("round-trip encoding/decoding", () => {
    it("should correctly round-trip strings", () => {
      const testStrings = [
        "Hello World!",
        "The quick brown fox jumps over the lazy dog",
        "你好世界",
        "🚀 Emoji test 🎉",
        "Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?",
        "",
      ];

      testStrings.forEach(str => {
        const encoded = stringToBase64url(str);
        const decoded = base64urlDecodeToString(encoded);
        expect(decoded).toBe(str);
      });
    });

    it("should correctly round-trip binary data", () => {
      const testData = [
        new Uint8Array([0, 1, 2, 3, 4, 5]),
        new Uint8Array([255, 254, 253, 252, 251]),
        new Uint8Array([]),
        new Uint8Array(256).fill(0).map((_, i) => i),
      ];

      testData.forEach(data => {
        const encoded = base64urlEncode(data);
        const decoded = base64urlDecode(encoded);
        expect(decoded).toEqual(data);
      });
    });
  });
});
