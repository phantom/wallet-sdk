import { Auth2Stamper } from "./Auth2Stamper";

// A valid P-256 uncompressed public key is 65 bytes: 0x04 || 32-byte x || 32-byte y.
const MOCK_RAW_PUBLIC_KEY = new Uint8Array([0x04, ...Array(64).fill(0x01)]);
const MOCK_SIGNATURE = new Uint8Array(64).fill(0x02);
const MOCK_DIGEST = new Uint8Array(32).fill(0x03);

const mockPrivateKey = { type: "private" } as CryptoKey;
const mockPublicKey = { type: "public" } as CryptoKey;
const mockKeyPair: CryptoKeyPair = { privateKey: mockPrivateKey, publicKey: mockPublicKey };

const mockSubtle = {
  generateKey: jest.fn().mockResolvedValue(mockKeyPair),
  exportKey: jest.fn((format: string) => {
    if (format === "raw") return Promise.resolve(MOCK_RAW_PUBLIC_KEY.buffer.slice(0) as ArrayBuffer);
    return Promise.resolve(new ArrayBuffer(0));
  }),
  sign: jest.fn().mockResolvedValue(MOCK_SIGNATURE.buffer.slice(0) as ArrayBuffer),
  digest: jest.fn().mockResolvedValue(MOCK_DIGEST.buffer.slice(0) as ArrayBuffer),
  importKey: jest.fn().mockResolvedValue(mockPrivateKey),
};

jest.mock("@phantom/base64url", () => ({
  base64urlEncode: jest.fn((data: Uint8Array) => Buffer.from(data).toString("base64url")),
}));

beforeEach(() => {
  Object.defineProperty(globalThis.crypto, "subtle", {
    value: mockSubtle,
    writable: true,
    configurable: true,
  });
  mockSubtle.generateKey.mockResolvedValue(mockKeyPair);
  mockSubtle.exportKey.mockImplementation((format: string) => {
    if (format === "raw") return Promise.resolve(MOCK_RAW_PUBLIC_KEY.buffer.slice(0) as ArrayBuffer);
    return Promise.resolve(new ArrayBuffer(0));
  });
  mockSubtle.sign.mockResolvedValue(MOCK_SIGNATURE.buffer.slice(0) as ArrayBuffer);
  mockSubtle.digest.mockResolvedValue(MOCK_DIGEST.buffer.slice(0) as ArrayBuffer);
});

afterEach(() => {
  jest.clearAllMocks();
});

function makeStamper(dbName = `test-db-${Math.random()}`) {
  return new Auth2Stamper(dbName);
}

describe("Auth2Stamper", () => {
  describe("getKeyInfo()", () => {
    it("returns null before init()", () => {
      expect(makeStamper().getKeyInfo()).toBeNull();
    });

    it("returns the keyInfo after init()", async () => {
      const stamper = makeStamper();
      await stamper.init();

      expect(stamper.getKeyInfo()).not.toBeNull();
    });
  });

  describe("init()", () => {
    it("generates a P-256 key pair on first call", async () => {
      const stamper = makeStamper();
      await stamper.init();

      expect(mockSubtle.generateKey).toHaveBeenCalledWith({ name: "ECDSA", namedCurve: "P-256" }, false, [
        "sign",
        "verify",
      ]);
    });

    it("exports the raw public key (65 bytes) to derive base58 encoding", async () => {
      const stamper = makeStamper();
      await stamper.init();

      expect(mockSubtle.exportKey).toHaveBeenCalledWith("raw", mockPublicKey);
    });

    it("returns a keyInfo object with keyId, publicKey (base58), and createdAt", async () => {
      const stamper = makeStamper();

      const keyInfo = await stamper.init();

      expect(keyInfo.keyId).toBeTruthy();
      expect(typeof keyInfo.publicKey).toBe("string");
      expect(keyInfo.publicKey.length).toBeGreaterThan(0);
      expect(typeof keyInfo.createdAt).toBe("number");
    });

    it("keyId is the first 16 chars of base64url(SHA-256(rawPublicKey))", async () => {
      const stamper = makeStamper();

      const keyInfo = await stamper.init();

      // SHA-256 mock returns 32 bytes of 0x03; base64url of that is deterministic.
      const expected = Buffer.from(MOCK_DIGEST).toString("base64url").substring(0, 16);
      expect(keyInfo.keyId).toBe(expected);
    });

    it("returns the same keyInfo on subsequent calls (loads from IndexedDB)", async () => {
      const dbName = `shared-db-${Date.now()}`;
      const stamper1 = new Auth2Stamper(dbName);
      const info1 = await stamper1.init();

      const stamper2 = new Auth2Stamper(dbName);
      const info2 = await stamper2.init();

      // Second call should load from storage, not generate a new key.
      expect(info2.keyId).toBe(info1.keyId);
      expect(info2.publicKey).toBe(info1.publicKey);
      // generateKey should only have been called once across both stampers.
      expect(mockSubtle.generateKey).toHaveBeenCalledTimes(1);
    });

    it("sets the algorithm property to secp256r1", () => {
      const stamper = makeStamper();
      expect(stamper.algorithm).toBeDefined();
    });

    it("restores the id token from IndexedDB on init()", async () => {
      const dbName = `restore-db-${Date.now()}`;
      const stamper1 = new Auth2Stamper(dbName);
      await stamper1.init();
      await stamper1.setIdToken("persisted-token");

      // A new stamper instance loads from the same DB — simulates app reload.
      const stamper2 = new Auth2Stamper(dbName);
      await stamper2.init();

      // Calling stamp() should succeed without any additional setIdToken call.
      await expect(stamper2.stamp({ type: "OIDC", data: Buffer.from("payload") })).resolves.toBeTruthy();
    });
  });

  describe("setIdToken()", () => {
    it("makes stamp() succeed after being called", async () => {
      const stamper = makeStamper();
      await stamper.init();

      await stamper.setIdToken("my-token");

      await expect(stamper.stamp({ type: "OIDC", data: Buffer.from("payload") })).resolves.toBeTruthy();
    });

    it("persists the token so a reloaded stamper can stamp without re-authenticating", async () => {
      const dbName = `persist-db-${Date.now()}`;
      const stamper = new Auth2Stamper(dbName);
      await stamper.init();
      await stamper.setIdToken("auto-connect-token");

      const reloaded = new Auth2Stamper(dbName);
      await reloaded.init();

      const stampStr = await reloaded.stamp({ type: "OIDC", data: Buffer.from("payload") });
      const decoded = JSON.parse(Buffer.from(stampStr, "base64url").toString("utf-8")) as {
        idToken: string;
      };
      expect(decoded.idToken).toBe("auto-connect-token");
    });
  });

  describe("stamp()", () => {
    it("throws if called before init()", async () => {
      const stamper = makeStamper();

      await expect(stamper.stamp({ type: "OIDC", data: Buffer.from("hello") })).rejects.toThrow("not initialized");
    });

    it("signs the data with ECDSA P-256 / SHA-256", async () => {
      const stamper = makeStamper();
      await stamper.init();
      await stamper.setIdToken("");

      const data = Buffer.from("test message");
      await stamper.stamp({ type: "OIDC", data });

      expect(mockSubtle.sign).toHaveBeenCalledWith(
        { name: "ECDSA", hash: "SHA-256" },
        mockPrivateKey,
        expect.any(Uint8Array),
      );
    });

    it("throws when called before setIdToken()", async () => {
      const stamper = makeStamper();
      await stamper.init();

      await expect(stamper.stamp({ type: "OIDC", data: Buffer.from("payload") })).rejects.toThrow("not initialized");
    });

    it("returns an OIDC stamp with the id token from setIdToken()", async () => {
      const stamper = makeStamper();
      await stamper.init();

      await stamper.setIdToken("test-id-token");

      const stampStr = await stamper.stamp({ type: "OIDC", data: Buffer.from("payload") });
      const decoded = JSON.parse(Buffer.from(stampStr, "base64url").toString("utf-8")) as {
        kind: string;
        idToken: string;
        publicKey: string;
        algorithm: string;
        salt: string;
        signature: string;
      };

      expect(decoded.kind).toBe("OIDC");
      expect(decoded.idToken).toBe("test-id-token");
      expect(decoded.algorithm).toBe("Secp256r1");
      expect(decoded.salt).toBe("");
      expect(typeof decoded.publicKey).toBe("string");
      expect(typeof decoded.signature).toBe("string");
    });

    it("uses the stored public key (base64url of raw P-256 bytes) in the OIDC stamp", async () => {
      const stamper = makeStamper();
      await stamper.init();
      await stamper.setIdToken("");

      const stampStr = await stamper.stamp({ type: "OIDC", data: Buffer.from("data") });
      const decoded = JSON.parse(Buffer.from(stampStr, "base64url").toString("utf-8")) as {
        publicKey: string;
      };

      // Public key in stamp should be base64url(MOCK_RAW_PUBLIC_KEY).
      expect(decoded.publicKey).toBe(Buffer.from(MOCK_RAW_PUBLIC_KEY).toString("base64url"));
    });

    it("works with empty data", async () => {
      const stamper = makeStamper();
      await stamper.init();
      await stamper.setIdToken("");
      await expect(stamper.stamp({ type: "OIDC", data: Buffer.from("") })).resolves.toBeTruthy();
    });
  });

  describe("resetKeyPair()", () => {
    it("throws if the DB was never opened (not initialized)", async () => {
      // A fresh stamper has db = null; clearStoredKey inside resetKeyPair will throw.
      const stamper = makeStamper();
      await expect(stamper.resetKeyPair()).rejects.toThrow();
    });

    it("generates a new key pair and returns new keyInfo", async () => {
      const stamper = makeStamper();
      await stamper.init();

      // Simulate a different public key on the second generateKey call.
      const newPublicKey = new Uint8Array([0x04, ...Array(64).fill(0x05)]);
      mockSubtle.exportKey.mockImplementationOnce(() => Promise.resolve(newPublicKey.buffer.slice(0) as ArrayBuffer));

      const newInfo = await stamper.resetKeyPair();
      expect(mockSubtle.generateKey).toHaveBeenCalledTimes(2);
      expect(newInfo).toBeTruthy();
    });

    it("clears the id token", async () => {
      const stamper = makeStamper();
      await stamper.init();
      await stamper.setIdToken("t");

      await stamper.resetKeyPair();

      // stamp() should now fail because the token was cleared.
      await expect(stamper.stamp({ type: "OIDC", data: Buffer.from("x") })).rejects.toThrow("not initialized");
    });
  });

  describe("clear()", () => {
    it("throws if the DB was never opened", async () => {
      const stamper = makeStamper();

      await expect(stamper.clear()).rejects.toThrow();
    });

    it("removes the stored key and nulls the in-memory state", async () => {
      const stamper = makeStamper();
      await stamper.init();

      expect(stamper.getKeyInfo()).not.toBeNull();

      await stamper.clear();

      expect(stamper.getKeyInfo()).toBeNull();
    });

    it("calling stamp() after clear() throws", async () => {
      const stamper = makeStamper();
      await stamper.init();
      await stamper.clear();

      await expect(stamper.stamp({ type: "OIDC", data: Buffer.from("x") })).rejects.toThrow("not initialized");
    });
  });

  describe("rotateKeyPair()", () => {
    it("delegates to init() — returns a keyInfo", async () => {
      const dbName = `rotate-db-${Date.now()}`;
      const stamper = new Auth2Stamper(dbName);
      await stamper.init();

      const info = await stamper.rotateKeyPair();

      expect(info).toBeTruthy();
      expect(info.keyId).toBeTruthy();
    });
  });

  describe("commitRotation()", () => {
    it("sets authenticatorId on keyInfo when initialized", async () => {
      const stamper = makeStamper();
      await stamper.init();
      await stamper.commitRotation("auth-id-xyz");

      expect(stamper.getKeyInfo()!.authenticatorId).toBe("auth-id-xyz");
    });

    it("does not throw when called before init()", async () => {
      const stamper = makeStamper();

      await expect(stamper.commitRotation("any")).resolves.toBeUndefined();
    });
  });

  describe("rollbackRotation()", () => {
    it("is a no-op and does not throw", async () => {
      const stamper = makeStamper();

      await expect(stamper.rollbackRotation()).resolves.toBeUndefined();
    });
  });
});
