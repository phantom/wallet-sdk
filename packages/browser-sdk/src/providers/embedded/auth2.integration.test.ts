/**
 * Integration tests for the browser Auth2 flow.
 *
 * Tests the cooperation between Auth2Stamper (real IndexedDB via fake-indexeddb)
 * and Auth2AuthProvider. Network-level calls (exchangeAuthCode, KMS RPC) are
 * mocked at the module boundary so the rest of the flow runs end-to-end.
 * createConnectStartUrl is also mocked to avoid full JAR-signing crypto in tests.
 *
 * Flow under test:
 *   1. Auth2Stamper.init() — generates P-256 key pair, stores in IndexedDB
 *   2. Auth2AuthProvider.authenticate() — builds OAuth URL, redirects browser
 *   3. (Simulate redirect back from auth server)
 *   4. Auth2AuthProvider.resumeAuthFromRedirect() — exchanges code, discovers
 *      org/wallet via KMS, returns AuthResult
 */

// Keep createCodeVerifier as real but mock URL-building and network calls.
// createConnectStartUrl is mocked to avoid running full JAR-signing crypto in tests.

const mockDiscoverOrganizationAndWalletId = jest
  .fn()
  .mockResolvedValue({ organizationId: "org-integration-123", walletId: "wallet-integration-456" });
const mockCreateConnectStartUrl = jest
  .fn()
  .mockResolvedValue(
    "https://auth.example.com/login/start?client_id=int-client-id&response_type=code&scope=openid&nonce=int-nonce&state=int-session-1&code_challenge=int-challenge&code_challenge_method=S256",
  );

jest.mock("@phantom/auth2", () => {
  const actual = jest.requireActual<Record<string, unknown>>("@phantom/auth2");
  return {
    ...actual,
    createConnectStartUrl: mockCreateConnectStartUrl,
    exchangeAuthCode: jest.fn().mockResolvedValue({
      idToken: "integration-id-token",
      bearerToken: "Bearer integration-id-token",
      authUserId: "integration-user-1",
      expiresInMs: 3_600_000,
    }),
    Auth2KmsRpcClient: jest.fn().mockImplementation(() => ({
      discoverOrganizationAndWalletId: mockDiscoverOrganizationAndWalletId,
    })),
  };
});

const MOCK_RAW_PUB = new Uint8Array([0x04, ...Array(64).fill(0x01)]);
const MOCK_SIG = new Uint8Array(64).fill(0x02);
const MOCK_DIGEST = new Uint8Array(32).fill(0x03);
const mockPrivateKey = { type: "private" } as CryptoKey;
const mockPublicKey = { type: "public" } as CryptoKey;

const mockSubtle = {
  generateKey: jest.fn().mockResolvedValue({ privateKey: mockPrivateKey, publicKey: mockPublicKey }),
  exportKey: jest.fn((format: string) => {
    if (format === "raw") return Promise.resolve(MOCK_RAW_PUB.buffer.slice(0) as ArrayBuffer);
    return Promise.resolve(new ArrayBuffer(0));
  }),
  sign: jest.fn().mockResolvedValue(MOCK_SIG.buffer.slice(0) as ArrayBuffer),
  digest: jest.fn().mockResolvedValue(MOCK_DIGEST.buffer.slice(0) as ArrayBuffer),
  importKey: jest.fn().mockResolvedValue(mockPrivateKey),
};

jest.mock("@phantom/base64url", () => ({
  base64urlEncode: jest.fn((data: Uint8Array) => Buffer.from(data).toString("base64url")),
}));

let navigateSpy: jest.SpyInstance;

beforeEach(() => {
  Object.defineProperty(globalThis.crypto, "subtle", {
    value: mockSubtle,
    writable: true,
    configurable: true,
  });
  mockSubtle.generateKey.mockResolvedValue({ privateKey: mockPrivateKey, publicKey: mockPublicKey });
  mockSubtle.exportKey.mockImplementation((format: string) => {
    if (format === "raw") return Promise.resolve(MOCK_RAW_PUB.buffer.slice(0) as ArrayBuffer);
    return Promise.resolve(new ArrayBuffer(0));
  });
  mockSubtle.sign.mockResolvedValue(MOCK_SIG.buffer.slice(0) as ArrayBuffer);
  mockSubtle.digest.mockResolvedValue(MOCK_DIGEST.buffer.slice(0) as ArrayBuffer);
  mockSubtle.importKey.mockResolvedValue(mockPrivateKey);
  mockDiscoverOrganizationAndWalletId.mockResolvedValue({
    organizationId: "org-integration-123",
    walletId: "wallet-integration-456",
  });
  mockCreateConnectStartUrl.mockResolvedValue(
    "https://auth.example.com/login/start?client_id=int-client-id&response_type=code&scope=openid&nonce=int-nonce&state=int-session-1&code_challenge=int-challenge&code_challenge_method=S256",
  );
  navigateSpy = jest.spyOn(Auth2AuthProvider, "navigate").mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllMocks();
  navigateSpy.mockRestore();
});

import type { StamperWithKeyManagement } from "@phantom/sdk-types";
import type { EmbeddedStorage, URLParamsAccessor } from "@phantom/embedded-provider-core";
import { Auth2Stamper } from "./adapters/Auth2Stamper";
import { Auth2AuthProvider } from "./adapters/Auth2AuthProvider";
import { exchangeAuthCode } from "@phantom/auth2";

const AUTH2_OPTIONS = {
  clientId: "int-client-id",
  redirectUri: "https://app.example.com/callback",
  connectLoginUrl: "https://auth.example.com/login/start",
  authApiBaseUrl: "https://auth.example.com",
};

const KMS_OPTIONS = { apiBaseUrl: "https://kms.example.com", appId: "int-app" };

type StoredSession = Record<string, unknown> | null;

function makeStorage(session: StoredSession = null) {
  let stored = session;
  return {
    getSession: jest.fn(() => Promise.resolve(stored)),
    saveSession: jest.fn((s: Record<string, unknown>) => {
      stored = s;
      return Promise.resolve();
    }),
    clearSession: jest.fn(() => {
      stored = null;
      return Promise.resolve();
    }),
    getShouldClearPreviousSession: jest.fn().mockResolvedValue(false),
    setShouldClearPreviousSession: jest.fn().mockResolvedValue(undefined),
    // Expose for assertions.
    _getStored: () => stored,
  };
}

function makeUrlParams(params: Record<string, string | null>) {
  return { getParam: jest.fn((k: string) => params[k] ?? null) };
}

function makeProvider(
  stamper: Auth2Stamper,
  storage: ReturnType<typeof makeStorage>,
  urlParams: ReturnType<typeof makeUrlParams>,
) {
  return new Auth2AuthProvider(
    stamper as unknown as StamperWithKeyManagement,
    storage as unknown as EmbeddedStorage,
    urlParams as unknown as URLParamsAccessor,
    AUTH2_OPTIONS,
    KMS_OPTIONS,
  );
}

describe("Auth2 browser flow — end-to-end", () => {
  it("full connect flow: stamper init → authenticate → resumeAuthFromRedirect → AuthResult", async () => {
    const sessionId = "int-session-1";
    const dbName = `int-db-${Date.now()}`;

    // ── Step 1: initialise the stamper (simulates page load before connect). ──
    const stamper = new Auth2Stamper(dbName);
    const keyInfo = await stamper.init();
    expect(keyInfo.publicKey).toBeTruthy();

    // ── Step 2: authenticate() — redirect to auth server. ────────────────────
    const session = { sessionId, walletId: undefined, organizationId: undefined };
    const storage = makeStorage(session);
    const provider = makeProvider(stamper, storage, makeUrlParams({}));

    await provider.authenticate({
      publicKey: keyInfo.publicKey,
      appId: "int-app",
      sessionId,
      provider: "google",
      redirectUrl: AUTH2_OPTIONS.redirectUri,
    });

    // Verify createConnectStartUrl was called with the stamper's crypto key pair.
    expect(mockCreateConnectStartUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        keyPair: stamper.getCryptoKeyPair(),
        sessionId,
        provider: "google",
      }),
    );

    // Verify the navigate was called with the mocked URL.
    expect(navigateSpy).toHaveBeenCalledWith(expect.stringContaining("auth.example.com"));

    // Verify pkceCodeVerifier was saved to session.
    const savedSession = storage._getStored();
    expect(savedSession?.pkceCodeVerifier).toBeTruthy();

    // ── Step 3: resumeAuthFromRedirect() — simulate browser returning. ───────
    const callbackParams = makeUrlParams({
      code: "callback-auth-code",
      state: sessionId,
    });
    const provider2 = makeProvider(stamper, storage, callbackParams);

    const result = await provider2.resumeAuthFromRedirect("google");

    expect(result).not.toBeNull();
    expect(result!.walletId).toBe("wallet-integration-456");
    expect(result!.organizationId).toBe("org-integration-123");
    expect(result!.provider).toBe("google");
    expect(result!.accountDerivationIndex).toBe(0);
    expect(result!.authUserId).toBe("integration-user-1");

    expect(exchangeAuthCode).toHaveBeenCalledWith(expect.objectContaining({ code: "callback-auth-code" }));
    expect(mockDiscoverOrganizationAndWalletId).toHaveBeenCalledWith(
      "Bearer integration-id-token",
      "integration-user-1",
    );
  });

  it("stamper key persists across provider instances (same IndexedDB)", async () => {
    const dbName = `persist-db-${Date.now()}`;

    const stamper1 = new Auth2Stamper(dbName);
    const info1 = await stamper1.init();

    const stamper2 = new Auth2Stamper(dbName);
    const info2 = await stamper2.init();

    // Second stamper should load the same key, not generate a new one.
    expect(info2.keyId).toBe(info1.keyId);
    expect(info2.publicKey).toBe(info1.publicKey);
    expect(mockSubtle.generateKey).toHaveBeenCalledTimes(1);
  });

  it("stamp() throws before setIdToken(); produces OIDC stamp after the id token is set", async () => {
    const dbName = `stamp-db-${Date.now()}`;
    const stamper = new Auth2Stamper(dbName);
    const keyInfo = await stamper.init();
    expect(keyInfo.publicKey).toBeTruthy();

    // Without the id token, stamp() must throw.
    await expect(stamper.stamp({ type: "OIDC", data: Buffer.from("test-payload") })).rejects.toThrow("not initialized");

    // After setting the id token, stamp() produces an OIDC envelope.
    await stamper.setIdToken("integration-id-token");
    const stampStr = await stamper.stamp({ type: "OIDC", data: Buffer.from("test-payload") });
    const decoded = JSON.parse(Buffer.from(stampStr, "base64url").toString()) as {
      kind: string;
      publicKey: string;
    };

    expect(decoded.kind).toBe("OIDC");
    expect(typeof decoded.publicKey).toBe("string");
  });

  it("resumeAuthFromRedirect returns null (no-op) when no code is in the callback URL", async () => {
    const dbName = `nocode-db-${Date.now()}`;
    const stamper = new Auth2Stamper(dbName);
    await stamper.init();

    const storage = makeStorage({ sessionId: "s1", pkceCodeVerifier: "v" });
    const provider = makeProvider(stamper, storage, makeUrlParams({}));

    const result = await provider.resumeAuthFromRedirect("google");

    expect(result).toBeNull();
    expect(exchangeAuthCode).not.toHaveBeenCalled();
  });

  it("CSRF check: resumeAuthFromRedirect throws when state does not match sessionId", async () => {
    const dbName = `csrf-db-${Date.now()}`;
    const stamper = new Auth2Stamper(dbName);
    await stamper.init();

    const storage = makeStorage({ sessionId: "legit-session", pkceCodeVerifier: "v" });
    const provider = makeProvider(stamper, storage, makeUrlParams({ code: "c", state: "ATTACKER-SESSION" }));

    await expect(provider.resumeAuthFromRedirect("google")).rejects.toThrow("CSRF");
  });

  it("session is cleaned up (pkceCodeVerifier removed) after a successful redirect", async () => {
    const dbName = `cleanup-db-${Date.now()}`;
    const stamper = new Auth2Stamper(dbName);
    await stamper.init();

    const storage = makeStorage({ sessionId: "s1", pkceCodeVerifier: "verifier" });
    const provider = makeProvider(stamper, storage, makeUrlParams({ code: "c", state: "s1" }));

    await provider.resumeAuthFromRedirect("google");

    const finalSession = storage._getStored();

    expect(finalSession?.pkceCodeVerifier).toBeUndefined();
    expect(finalSession?.bearerToken).toBe("Bearer integration-id-token");
  });

  it("getCryptoKeyPair() returns a CryptoKeyPair after stamper.init()", async () => {
    const stamper = new Auth2Stamper(`keypair-db-${Date.now()}`);
    expect(stamper.getCryptoKeyPair()).toBeNull();
    await stamper.init();

    const kp = stamper.getCryptoKeyPair();

    expect(kp).not.toBeNull();
    expect(kp!.privateKey).toBe(mockPrivateKey);
    expect(kp!.publicKey).toBe(mockPublicKey);
  });
});
