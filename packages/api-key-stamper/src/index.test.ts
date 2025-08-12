import { ApiKeyStamper } from "./index";
import { generateKeyPair, signWithSecret } from "@phantom/crypto";
import { base64urlDecode, base64urlDecodeToString } from "@phantom/base64url";
import { Buffer } from "buffer";

describe("ApiKeyStamper", () => {
  let testKeyPair: { publicKey: string; secretKey: string };
  let stamper: ApiKeyStamper;

  beforeEach(() => {
    // Generate a test key pair using crypto package
    testKeyPair = generateKeyPair();
    stamper = new ApiKeyStamper({ apiSecretKey: testKeyPair.secretKey });
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
    it("should return complete X-Phantom-Stamp header value", () => {
      const testData = Buffer.from("test message", "utf8");
      
      const stamp = stamper.stamp(testData);
      
      expect(typeof stamp).toBe("string");
      expect(stamp.length).toBeGreaterThan(0);
      
      // Should be a base64url encoded JSON
      const stampJson = base64urlDecodeToString(stamp);
      const stampData = JSON.parse(stampJson);
      
      expect(stampData).toHaveProperty("publicKey");
      expect(stampData).toHaveProperty("signature");
      expect(stampData).toHaveProperty("kind");
      expect(stampData.kind).toBe("PKI");
    });

    it("should create valid stamp with verifiable signature", () => {
      const testData = Buffer.from("test message for verification", "utf8");
      
      const stamp = stamper.stamp(testData);
      
      // Decode the stamp
      const stampJson = base64urlDecodeToString(stamp);
      const stampData = JSON.parse(stampJson);
      
      // Verify the signature
      const signature = base64urlDecode(stampData.signature);
      const expectedSignature = signWithSecret(testKeyPair.secretKey, testData);
      
      expect(signature).toEqual(expectedSignature);
    });

    it("should create different stamps for different data", () => {
      const data1 = Buffer.from("first message", "utf8");
      const data2 = Buffer.from("second message", "utf8");
      
      const stamp1 = stamper.stamp(data1);
      const stamp2 = stamper.stamp(data2);
      
      expect(stamp1).not.toBe(stamp2);
    });

    it("should create consistent stamps for the same data", () => {
      const testData = Buffer.from("consistent message", "utf8");
      
      const stamp1 = stamper.stamp(testData);
      const stamp2 = stamper.stamp(testData);
      
      // The stamps should be the same for the same data and same key
      expect(stamp1).toBe(stamp2);
    });
  });
});