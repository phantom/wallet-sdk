import { ApiKeyStamper } from "./index";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Buffer } from "buffer";

describe("ApiKeyStamper", () => {
  let testKeyPair: nacl.SignKeyPair;
  let testSecretKeyBase58: string;
  let stamper: ApiKeyStamper;

  beforeEach(() => {
    // Generate a test key pair
    testKeyPair = nacl.sign.keyPair();
    testSecretKeyBase58 = bs58.encode(testKeyPair.secretKey);
    stamper = new ApiKeyStamper({ apiSecretKey: testSecretKeyBase58 });
  });

  describe("constructor", () => {
    it("should create a stamper with valid secret key", () => {
      expect(stamper).toBeInstanceOf(ApiKeyStamper);
    });

    it("should throw error with invalid secret key", () => {
      expect(() => {
        new ApiKeyStamper({ apiSecretKey: "invalid-key" });
      }).toThrow();
    });
  });

  describe("stamp", () => {
    it("should add X-Phantom-Stamp header to request config", async () => {
      const config = {
        url: "https://api.example.com/test",
        method: "POST" as const,
        data: { message: "test" },
      };

      const stamped = await stamper.stamp(config);

      expect(stamped.headers).toBeDefined();
      expect(stamped.headers!["X-Phantom-Stamp"]).toBeDefined();
      expect(typeof stamped.headers!["X-Phantom-Stamp"]).toBe("string");
    });

    it("should preserve existing headers", async () => {
      const config = {
        url: "https://api.example.com/test",
        method: "POST" as const,
        data: { message: "test" },
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token",
        },
      };

      const stamped = await stamper.stamp(config);

      expect(stamped.headers!["Content-Type"]).toBe("application/json");
      expect(stamped.headers!["Authorization"]).toBe("Bearer token");
      expect(stamped.headers!["X-Phantom-Stamp"]).toBeDefined();
    });

    it("should handle string data", async () => {
      const config = {
        url: "https://api.example.com/test",
        method: "POST" as const,
        data: "string data",
      };

      const stamped = await stamper.stamp(config);
      expect(stamped.headers!["X-Phantom-Stamp"]).toBeDefined();
    });

    it("should handle object data", async () => {
      const config = {
        url: "https://api.example.com/test",
        method: "POST" as const,
        data: { key: "value", number: 42 },
      };

      const stamped = await stamper.stamp(config);
      expect(stamped.headers!["X-Phantom-Stamp"]).toBeDefined();
    });

    it("should create valid stamp structure", async () => {
      const config = {
        url: "https://api.example.com/test",
        method: "POST" as const,
        data: { message: "test" },
      };

      const stamped = await stamper.stamp(config);
      const stampHeader = stamped.headers!["X-Phantom-Stamp"] as string;

      // Decode the stamp
      const stampJson = decodeBase64url(stampHeader);
      const stampData = JSON.parse(stampJson);

      expect(stampData).toHaveProperty("publicKey");
      expect(stampData).toHaveProperty("signature");
      expect(stampData).toHaveProperty("kind");
      expect(stampData.kind).toBe("PKI");
      expect(typeof stampData.publicKey).toBe("string");
      expect(typeof stampData.signature).toBe("string");
    });

    it("should create valid signatures", async () => {
      const testData = { message: "test message" };
      const config = {
        url: "https://api.example.com/test",
        method: "POST" as const,
        data: testData,
      };

      const stamped = await stamper.stamp(config);
      const stampHeader = stamped.headers!["X-Phantom-Stamp"] as string;

      // Decode and verify the stamp
      const stampJson = decodeBase64url(stampHeader);
      const stampData = JSON.parse(stampJson);

      // Decode the public key and signature
      const publicKey = decodeBase64urlToUint8Array(stampData.publicKey);
      const signature = decodeBase64urlToUint8Array(stampData.signature);

      // Verify the signature
      const requestBody = JSON.stringify(testData);
      const dataUtf8 = Buffer.from(requestBody, "utf8");
      const isValid = nacl.sign.detached.verify(dataUtf8, signature, publicKey);

      expect(isValid).toBe(true);
    });

    it("should create different signatures for different data", async () => {
      const config1 = {
        url: "https://api.example.com/test",
        method: "POST" as const,
        data: { message: "first message" },
      };

      const config2 = {
        url: "https://api.example.com/test",
        method: "POST" as const,
        data: { message: "second message" },
      };

      const stamped1 = await stamper.stamp(config1);
      const stamped2 = await stamper.stamp(config2);

      const stamp1 = stamped1.headers!["X-Phantom-Stamp"];
      const stamp2 = stamped2.headers!["X-Phantom-Stamp"];

      expect(stamp1).not.toBe(stamp2);
    });

    it("should create consistent stamps for same data", async () => {
      const config = {
        url: "https://api.example.com/test",
        method: "POST" as const,
        data: { message: "consistent message" },
      };

      const stamped1 = await stamper.stamp({ ...config });
      const stamped2 = await stamper.stamp({ ...config });

      // The stamps should be the same for the same data and same key
      expect(stamped1.headers!["X-Phantom-Stamp"]).toBe(stamped2.headers!["X-Phantom-Stamp"]);
    });

    it("should handle empty data", async () => {
      const config = {
        url: "https://api.example.com/test",
        method: "GET" as const,
        data: undefined,
      };

      const stamped = await stamper.stamp(config);
      expect(stamped.headers!["X-Phantom-Stamp"]).toBeDefined();
    });
  });
});

// Helper functions for testing
function decodeBase64url(str: string): string {
  const base64 = str
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");

  return Buffer.from(base64, "base64").toString("utf8");
}

function decodeBase64urlToUint8Array(str: string): Uint8Array {
  const base64 = str
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");

  const binaryString = Buffer.from(base64, "base64").toString("binary");
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
