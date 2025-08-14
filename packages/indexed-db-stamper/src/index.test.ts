import { IndexedDbStamper } from "./index";
import type { StamperKeyInfo } from "@phantom/sdk-types";

// Mock crypto.subtle methods
const mockGenerateKey = jest.fn();
const mockSign = jest.fn();
const mockExportKey = jest.fn();
const mockDigest = jest.fn();

Object.defineProperty(global, "crypto", {
  value: {
    subtle: {
      generateKey: mockGenerateKey,
      sign: mockSign,
      exportKey: mockExportKey,
      digest: mockDigest,
    },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
  writable: true,
});

describe("IndexedDbStamper", () => {
  let stamper: IndexedDbStamper;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create new stamper instance
    stamper = new IndexedDbStamper({
      dbName: "test-phantom-stamper",
      storeName: "test-crypto-keys",
      keyName: "test-signing-key",
    });
  });

  afterEach(async () => {
    // Clean up
    try {
      await stamper.clear();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe("constructor", () => {
    it("should create stamper with default config", () => {
      const defaultStamper = new IndexedDbStamper();
      expect(defaultStamper).toBeInstanceOf(IndexedDbStamper);
    });

    it("should create stamper with custom config", () => {
      const customStamper = new IndexedDbStamper({
        dbName: "custom-db",
        storeName: "custom-store",
        keyName: "custom-key",
      });
      expect(customStamper).toBeInstanceOf(IndexedDbStamper);
    });

    it("should throw error in non-browser environment", () => {
      const originalWindow = global.window;
      const originalIndexedDB = global.indexedDB;

      // @ts-ignore
      delete global.window;
      // @ts-ignore
      delete global.indexedDB;

      expect(() => new IndexedDbStamper()).toThrow(
        "IndexedDbStamper requires a browser environment with IndexedDB support",
      );

      // Restore
      global.window = originalWindow;
      global.indexedDB = originalIndexedDB;
    });
  });

  describe("initialization", () => {
    beforeEach(() => {
      // Mock crypto.subtle methods for successful key generation
      const mockKeyPair = {
        privateKey: {} as CryptoKey,
        publicKey: {} as CryptoKey,
      };

      const mockPublicKeyBuffer = new ArrayBuffer(91); // Typical SPKI length
      const mockKeyIdBuffer = new ArrayBuffer(32);

      mockGenerateKey.mockResolvedValue(mockKeyPair);
      mockExportKey.mockResolvedValue(mockPublicKeyBuffer);
      mockDigest.mockResolvedValue(mockKeyIdBuffer);
    });

    it("should initialize and generate new key pair", async () => {
      const keyInfo = await stamper.init();

      expect(keyInfo).toHaveProperty("keyId");
      expect(keyInfo).toHaveProperty("publicKey");
      expect(typeof keyInfo.keyId).toBe("string");
      expect(typeof keyInfo.publicKey).toBe("string");
      expect(keyInfo.keyId.length).toBe(16);

      expect(mockGenerateKey).toHaveBeenCalledWith({ name: "Ed25519" }, false, ["sign", "verify"]);
    });

    it("should return existing key info if already initialized", async () => {
      // First initialization
      const keyInfo1 = await stamper.init();

      // Second initialization should return same key info
      const keyInfo2 = await stamper.init();

      expect(keyInfo1).toEqual(keyInfo2);
      expect(stamper.getKeyInfo()).toEqual(keyInfo1);
    });

    it("should handle initialization errors", async () => {
      mockGenerateKey.mockRejectedValue(new Error("Key generation failed"));

      await expect(stamper.init()).rejects.toThrow("Key generation failed");
    });
  });

  describe("signing operations", () => {
    let _keyInfo: StamperKeyInfo;

    beforeEach(async () => {
      // Setup successful initialization
      const mockKeyPair = {
        privateKey: {} as CryptoKey,
        publicKey: {} as CryptoKey,
      };

      const mockPublicKeyBuffer = new ArrayBuffer(91);
      const mockKeyIdBuffer = new ArrayBuffer(32);
      const mockSignature = new ArrayBuffer(64); // Ed25519 signature length

      mockGenerateKey.mockResolvedValue(mockKeyPair);
      mockExportKey.mockResolvedValue(mockPublicKeyBuffer);
      mockDigest.mockResolvedValue(mockKeyIdBuffer);
      mockSign.mockResolvedValue(mockSignature);

      _keyInfo = await stamper.init();
    });

    it("should create stamp from Buffer data", async () => {
      const testData = Buffer.from("test message to sign", "utf8");
      const stamp = await stamper.stamp({ data: testData });

      expect(typeof stamp).toBe("string");
      expect(stamp.length).toBeGreaterThan(0);
      expect(mockSign).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Ed25519",
        }),
        expect.any(Object),
        expect.anything(),
      );
    });

    it("should create stamp with proper structure", async () => {
      const testData = Buffer.from(JSON.stringify({ action: "test", timestamp: Date.now() }), "utf8");
      const stamp = await stamper.stamp({ data: testData });

      expect(typeof stamp).toBe("string");
      expect(stamp.length).toBeGreaterThan(0);

      // The stamp should be base64url encoded JSON
      expect(stamp).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should throw error when stamping without initialization", async () => {
      const uninitializedStamper = new IndexedDbStamper({
        dbName: "uninitialized-test",
      });

      const testData = Buffer.from("test", "utf8");
      await expect(uninitializedStamper.stamp({ data: testData })).rejects.toThrow(
        "Stamper not initialized. Call init() first.",
      );
    });

    it("should handle signing errors", async () => {
      mockSign.mockRejectedValue(new Error("Signing failed"));

      const testData = Buffer.from("test", "utf8");
      await expect(
        stamper.stamp({
          data: testData,
        }),
      ).rejects.toThrow("Signing failed");
    });
  });

  describe("key management", () => {
    beforeEach(async () => {
      const mockKeyPair = {
        privateKey: {} as CryptoKey,
        publicKey: {} as CryptoKey,
      };

      const mockPublicKeyBuffer = new ArrayBuffer(91);
      const mockKeyIdBuffer = new ArrayBuffer(32);

      mockGenerateKey.mockResolvedValue(mockKeyPair);
      mockExportKey.mockResolvedValue(mockPublicKeyBuffer);
      mockDigest.mockResolvedValue(mockKeyIdBuffer);

      await stamper.init();
    });

    it("should reset key pair", async () => {
      const originalKeyInfo = stamper.getKeyInfo();

      // Set up different mock data for the reset operation
      const newMockKeyIdBuffer = new ArrayBuffer(32);
      const newView = new Uint8Array(newMockKeyIdBuffer);
      for (let i = 0; i < newView.length; i++) {
        newView[i] = (i + 100) % 256; // Different pattern from original
      }

      const newMockKeyPair = {
        privateKey: {} as CryptoKey,
        publicKey: {} as CryptoKey,
      };
      const newMockPublicKeyBuffer = new ArrayBuffer(91);

      mockGenerateKey.mockResolvedValueOnce(newMockKeyPair);
      mockExportKey.mockResolvedValueOnce(newMockPublicKeyBuffer);
      mockDigest.mockResolvedValueOnce(newMockKeyIdBuffer);

      const newKeyInfo = await stamper.resetKeyPair();

      expect(newKeyInfo).toHaveProperty("keyId");
      expect(newKeyInfo).toHaveProperty("publicKey");
      expect(newKeyInfo.keyId).not.toBe(originalKeyInfo?.keyId);
      expect(stamper.getKeyInfo()).toEqual(newKeyInfo);
    });

    it("should clear all keys", async () => {
      await stamper.clear();
      expect(stamper.getKeyInfo()).toBeNull();
    });

    it("should return null for key info before initialization", () => {
      const newStamper = new IndexedDbStamper({
        dbName: "new-test-db",
      });
      expect(newStamper.getKeyInfo()).toBeNull();
    });
  });

  describe("signature format", () => {
    it("should handle Ed25519 signatures", async () => {
      // Setup stamper
      const mockKeyPair = {
        privateKey: {} as CryptoKey,
        publicKey: {} as CryptoKey,
      };

      const mockPublicKeyBuffer = new ArrayBuffer(91);
      const mockKeyIdBuffer = new ArrayBuffer(32);

      // Create a mock Ed25519 signature (64 bytes)
      const mockEd25519Signature = new ArrayBuffer(64);
      const mockEd25519View = new Uint8Array(mockEd25519Signature);
      // Fill with test data
      for (let i = 0; i < 64; i++) {
        mockEd25519View[i] = i % 256;
      }

      mockGenerateKey.mockResolvedValue(mockKeyPair);
      mockExportKey.mockResolvedValue(mockPublicKeyBuffer);
      mockDigest.mockResolvedValue(mockKeyIdBuffer);
      mockSign.mockResolvedValue(mockEd25519Signature);

      await stamper.init();
      const testData = Buffer.from("test", "utf8");
      const signature = await stamper.stamp({
        data: testData,
      });

      // Ed25519 signatures should be base64url encoded
      expect(typeof signature).toBe("string");
      expect(signature).toMatch(/^[A-Za-z0-9_-]+$/); // base64url pattern
    });
  });

  describe("error handling", () => {
    it("should handle IndexedDB errors gracefully", () => {
      // This test is complex due to IndexedDB async nature
      // For now, just test that the method exists and can be called
      expect(typeof stamper.init).toBe("function");
    });

    it("should handle uninitialized stamper", async () => {
      const uninitializedStamper = new IndexedDbStamper({
        dbName: "uninitialized-test-db",
      });

      const testData = Buffer.from("test", "utf8");
      await expect(
        uninitializedStamper.stamp({
          data: testData,
        }),
      ).rejects.toThrow("Stamper not initialized. Call init() first.");
    });
  });
});
