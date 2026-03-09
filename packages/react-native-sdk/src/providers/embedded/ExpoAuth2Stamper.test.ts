import * as SecureStore from "expo-secure-store";
import { ExpoAuth2Stamper } from "./ExpoAuth2Stamper";

const MOCK_RAW_PUBLIC_KEY = new Uint8Array([0x04, ...Array(64).fill(0x11)]); // 65-byte P-256
const MOCK_PKCS8 = new Uint8Array(100).fill(0x22);
const MOCK_SIGNATURE = new Uint8Array(64).fill(0x33);
const MOCK_DIGEST = new Uint8Array(32).fill(0x44);

const mockPrivateKey = { type: "private", algorithm: { name: "ECDSA" } } as CryptoKey;
const mockPublicKey = { type: "public", algorithm: { name: "ECDSA" } } as CryptoKey;
const mockKeyPair: CryptoKeyPair = { privateKey: mockPrivateKey, publicKey: mockPublicKey };

const mockSubtle = {
  generateKey: jest.fn().mockResolvedValue(mockKeyPair),
  exportKey: jest.fn((format: string) => {
    if (format === "raw") return Promise.resolve(MOCK_RAW_PUBLIC_KEY.buffer.slice(0) as ArrayBuffer);
    if (format === "pkcs8") return Promise.resolve(MOCK_PKCS8.buffer.slice(0) as ArrayBuffer);
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
    if (format === "pkcs8") return Promise.resolve(MOCK_PKCS8.buffer.slice(0) as ArrayBuffer);
    return Promise.resolve(new ArrayBuffer(0));
  });
  mockSubtle.sign.mockResolvedValue(MOCK_SIGNATURE.buffer.slice(0) as ArrayBuffer);
  mockSubtle.digest.mockResolvedValue(MOCK_DIGEST.buffer.slice(0) as ArrayBuffer);
  mockSubtle.importKey.mockResolvedValue(mockPrivateKey);
  jest.clearAllMocks();
});

function makeStamper(storageKey = `phantom-auth2-test-${Math.random()}`) {
  return new ExpoAuth2Stamper(storageKey);
}

// Pre-computed: bs58.encode(MOCK_RAW_PUBLIC_KEY) where MOCK_RAW_PUBLIC_KEY = [0x04, 0x11 × 64]
const STORED_PUBLIC_KEY_BASE58 =
  "MpEALt31ZMzbaFHHt4TUTZ8eT3vovb7Bv3SpZUWhCDGHnND2aSxmeXF6CeWagvBG3MEYvvzWiJrfm7oy15DupRex";

function storedRecord(extras: object = {}, pkcs8Base64 = Buffer.from(MOCK_PKCS8).toString("base64")) {
  return JSON.stringify({
    privateKeyPkcs8: pkcs8Base64,
    keyInfo: {
      keyId: "stored-key-id",
      publicKey: STORED_PUBLIC_KEY_BASE58,
      createdAt: 1_000_000,
    },
    ...extras,
  });
}

describe("ExpoAuth2Stamper", () => {
  describe("getKeyInfo()", () => {
    it("returns null before init()", () => {
      expect(makeStamper().getKeyInfo()).toBeNull();
    });

    it("returns keyInfo after init()", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null); // empty store

      const stamper = makeStamper();
      await stamper.init();

      expect(stamper.getKeyInfo()).not.toBeNull();
    });
  });

  describe("init()", () => {
    it("generates a new P-256 key pair when SecureStore is empty", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const stamper = makeStamper();
      await stamper.init();

      expect(mockSubtle.generateKey).toHaveBeenCalledWith(
        { name: "ECDSA", namedCurve: "P-256" },
        true, // extractable so PKCS8 can be exported
        ["sign", "verify"],
      );
    });

    it("exports PKCS#8 private key and persists to SecureStore", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      const storageKey = "phantom-auth2-app-1";
      const stamper = new ExpoAuth2Stamper(storageKey);

      await stamper.init();

      expect(mockSubtle.exportKey).toHaveBeenCalledWith("pkcs8", mockPrivateKey);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        storageKey,
        expect.stringContaining("privateKeyPkcs8"),
        expect.objectContaining({ requireAuthentication: false }),
      );
    });

    it("loads an existing key from SecureStore without generating a new one", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(storedRecord());

      const stamper = makeStamper();
      const keyInfo = await stamper.init();

      expect(mockSubtle.generateKey).not.toHaveBeenCalled();
      expect(keyInfo.keyId).toBe("stored-key-id");
      expect(keyInfo.publicKey).toBe(STORED_PUBLIC_KEY_BASE58);
    });

    it("imports the stored PKCS#8 key as non-extractable in memory", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(storedRecord());

      const stamper = makeStamper();
      await stamper.init();

      expect(mockSubtle.importKey).toHaveBeenCalledWith(
        "pkcs8",
        // Buffer (from the "buffer" npm package) has the same byteLength as the original PKCS#8 data.
        // Using objectContaining avoids cross-realm instanceof issues between Buffer and Uint8Array.
        expect.objectContaining({ byteLength: MOCK_PKCS8.byteLength }),
        { name: "ECDSA", namedCurve: "P-256" },
        false, // non-extractable in memory
        ["sign"],
      );
    });

    it("generates a new key when SecureStore returns invalid JSON", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("not-valid-json");

      const stamper = makeStamper();
      await stamper.init();

      expect(mockSubtle.generateKey).toHaveBeenCalled();
    });

    it("generates a new key when SecureStore.getItemAsync throws", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error("Keychain error"));

      const stamper = makeStamper();
      await stamper.init();

      expect(mockSubtle.generateKey).toHaveBeenCalled();
    });

    it("keyInfo.keyId is the first 16 chars of base64url(SHA-256(rawPublicKey))", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const stamper = makeStamper();
      const keyInfo = await stamper.init();

      const expected = Buffer.from(MOCK_DIGEST).toString("base64url").substring(0, 16);
      expect(keyInfo.keyId).toBe(expected);
    });

    it("restores the id token from SecureStore on init()", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(storedRecord({ idToken: "persisted-token" }));

      const stamper = makeStamper();
      await stamper.init();

      // stamp() should succeed without any additional setIdToken call.
      await expect(stamper.stamp({ type: "OIDC", data: Buffer.from("payload") })).resolves.toBeTruthy();
    });
  });

  describe("setIdToken()", () => {
    it("makes stamp() succeed after being called", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const stamper = makeStamper();
      await stamper.init();

      // setIdToken reads the existing record to merge — return it
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(storedRecord());
      await stamper.setIdToken("my-token");

      await expect(stamper.stamp({ type: "OIDC", data: Buffer.from("payload") })).resolves.toBeTruthy();
    });

    it("persists the token to SecureStore alongside the key record", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      const storageKey = "phantom-auth2-persist-test";
      const stamper = new ExpoAuth2Stamper(storageKey);
      await stamper.init();

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(storedRecord());
      await stamper.setIdToken("token-x");

      const lastSaveCall = (SecureStore.setItemAsync as jest.Mock).mock.calls.at(-1) as [string, string];
      const saved = JSON.parse(lastSaveCall[1]) as { idToken?: string };
      expect(saved.idToken).toBe("token-x");
    });

    it("restores token in stamp output after a reload", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(storedRecord({ idToken: "reload-token" }));

      const stamper = makeStamper();
      await stamper.init();

      const stampStr = await stamper.stamp({ type: "OIDC", data: Buffer.from("payload") });
      const decoded = JSON.parse(Buffer.from(stampStr, "base64url").toString()) as {
        idToken: string;
      };
      expect(decoded.idToken).toBe("reload-token");
    });
  });

  describe("stamp()", () => {
    it("throws if called before init()", async () => {
      const stamper = makeStamper();

      await expect(stamper.stamp({ type: "OIDC", data: Buffer.from("x") })).rejects.toThrow("not initialized");
    });

    it("signs with ECDSA P-256 / SHA-256", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const stamper = makeStamper();
      await stamper.init();
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(storedRecord());
      await stamper.setIdToken("");

      await stamper.stamp({ type: "OIDC", data: Buffer.from("payload") });

      expect(mockSubtle.sign).toHaveBeenCalledWith(
        { name: "ECDSA", hash: "SHA-256" },
        mockPrivateKey,
        expect.any(Uint8Array),
      );
    });

    it("throws when called before setIdToken()", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const stamper = makeStamper();
      await stamper.init();

      await expect(stamper.stamp({ type: "OIDC", data: Buffer.from("msg") })).rejects.toThrow("not initialized");
    });

    it("returns an OIDC stamp with the id token from setIdToken()", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const stamper = makeStamper();
      await stamper.init();
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(storedRecord());
      await stamper.setIdToken("rn-id-token");

      const stampStr = await stamper.stamp({ type: "OIDC", data: Buffer.from("payload") });
      const decoded = JSON.parse(Buffer.from(stampStr, "base64url").toString()) as {
        kind: string;
        idToken: string;
        publicKey: string;
        algorithm: string;
        salt: string;
        signature: string;
      };

      expect(decoded.kind).toBe("OIDC");
      expect(decoded.idToken).toBe("rn-id-token");
      expect(decoded.algorithm).toBe("Secp256r1");
      expect(decoded.salt).toBe("");
      expect(typeof decoded.publicKey).toBe("string");
      expect(typeof decoded.signature).toBe("string");
    });

    it("public key in stamp is base64url of the raw P-256 bytes", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const stamper = makeStamper();
      await stamper.init();
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(storedRecord());
      await stamper.setIdToken("");

      const stampStr = await stamper.stamp({ type: "OIDC", data: Buffer.from("x") });
      const decoded = JSON.parse(Buffer.from(stampStr, "base64url").toString()) as { publicKey: string };
      expect(decoded.publicKey).toBe(Buffer.from(MOCK_RAW_PUBLIC_KEY).toString("base64url"));
    });
  });

  describe("resetKeyPair()", () => {
    it("generates a fresh key pair, replacing the stored one", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const stamper = makeStamper();
      await stamper.init();

      // Second generateKey call returns a distinct key.
      const newPublic = new Uint8Array([0x04, ...Array(64).fill(0x55)]);
      mockSubtle.exportKey.mockImplementationOnce(() => Promise.resolve(newPublic.buffer.slice(0) as ArrayBuffer));
      mockSubtle.exportKey.mockImplementationOnce(() => Promise.resolve(MOCK_PKCS8.buffer.slice(0) as ArrayBuffer));

      const newInfo = await stamper.resetKeyPair();

      expect(mockSubtle.generateKey).toHaveBeenCalledTimes(2);
      expect(newInfo).toBeTruthy();
    });

    it("deletes the old record from SecureStore before generating", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
      const storageKey = "reset-key";

      const stamper = new ExpoAuth2Stamper(storageKey);
      await stamper.init();
      await stamper.resetKeyPair();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(storageKey);
    });

    it("clears the id token", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const stamper = makeStamper();
      await stamper.init();
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(storedRecord());
      await stamper.setIdToken("t");

      await stamper.resetKeyPair();

      await expect(stamper.stamp({ type: "OIDC", data: Buffer.from("x") })).rejects.toThrow("not initialized");
    });
  });

  describe("clear()", () => {
    it("nulls in-memory state", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const stamper = makeStamper();
      await stamper.init();
      await stamper.clear();

      expect(stamper.getKeyInfo()).toBeNull();
    });

    it("calls deleteItemAsync on SecureStore", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const storageKey = "clear-key";
      const stamper = new ExpoAuth2Stamper(storageKey);
      await stamper.init();
      await stamper.clear();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(storageKey);
    });

    it("does not throw when SecureStore.deleteItemAsync fails", async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValueOnce(new Error("not found"));

      const stamper = makeStamper();

      await expect(stamper.clear()).resolves.toBeUndefined();
    });

    it("stamp() throws after clear()", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const stamper = makeStamper();
      await stamper.init();
      await stamper.clear();

      await expect(stamper.stamp({ type: "OIDC", data: Buffer.from("x") })).rejects.toThrow("not initialized");
    });
  });

  describe("rotateKeyPair()", () => {
    it("delegates to init() and returns a keyInfo", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null); // for init()
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null); // for rotateKeyPair -> init()

      const stamper = makeStamper();
      await stamper.init();
      const info = await stamper.rotateKeyPair();

      expect(info).toBeTruthy();
    });
  });

  describe("commitRotation()", () => {
    it("sets authenticatorId on keyInfo when initialized", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const stamper = makeStamper();
      await stamper.init();
      await stamper.commitRotation("auth-id-abc");

      expect(stamper.getKeyInfo()!.authenticatorId).toBe("auth-id-abc");
    });

    it("is a no-op when not initialized", async () => {
      const stamper = makeStamper();

      await expect(stamper.commitRotation("id")).resolves.toBeUndefined();
    });
  });

  describe("rollbackRotation()", () => {
    it("is a no-op and resolves", async () => {
      await expect(makeStamper().rollbackRotation()).resolves.toBeUndefined();
    });
  });
});
