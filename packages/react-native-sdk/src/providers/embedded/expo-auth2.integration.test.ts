/**
 * Integration tests for the React Native (Expo) Auth2 flow.
 *
 * Tests the cooperation between ExpoAuth2Stamper (real crypto via mocked
 * expo-secure-store) and ExpoAuth2AuthProvider. Network-level calls
 * (exchangeAuthCode, KMS RPC, expo-web-browser) are mocked at the module
 * boundary so the rest of the flow runs end-to-end.
 *
 * Flow under test:
 *   1. ExpoAuth2Stamper.init() — generates P-256 key pair, stores in SecureStore
 *   2. ExpoAuth2AuthProvider.authenticate() — builds OAuth URL, opens browser,
 *      parses callback, exchanges code, discovers org/wallet, returns AuthResult
 */

const mockDiscoverOrganizationAndWalletId = jest
  .fn()
  .mockResolvedValue({ organizationId: "org-rn-int-123", walletId: "wallet-rn-int-456" });
const mockCreateConnectStartUrl = jest
  .fn()
  .mockResolvedValue("https://auth.example.com/login/start?state=rn-int-session-1");

jest.mock("@phantom/auth2", () => {
  const actual = jest.requireActual<Record<string, unknown>>("@phantom/auth2");
  return {
    ...actual,
    createConnectStartUrl: mockCreateConnectStartUrl,
    exchangeAuthCode: jest.fn().mockResolvedValue({
      idToken: "rn-int-id-token",
      bearerToken: "Bearer rn-int-id-token",
      authUserId: "rn-int-user-1",
      expiresInMs: 7_200_000,
    }),
    Auth2KmsRpcClient: jest.fn().mockImplementation(() => ({
      discoverOrganizationAndWalletId: mockDiscoverOrganizationAndWalletId,
    })),
  };
});

const MOCK_RAW_PUB = new Uint8Array([0x04, ...Array(64).fill(0xaa)]);
const MOCK_PKCS8 = new Uint8Array(100).fill(0xbb);
const MOCK_SIG = new Uint8Array(64).fill(0xcc);
const MOCK_DIGEST_BYTES = new Uint8Array(32).fill(0xdd);

const mockPrivateKey = { type: "private", algorithm: { name: "ECDSA" } } as CryptoKey;
const mockPublicKey = { type: "public", algorithm: { name: "ECDSA" } } as CryptoKey;

const mockSubtle = {
  generateKey: jest.fn().mockResolvedValue({ privateKey: mockPrivateKey, publicKey: mockPublicKey }),
  exportKey: jest.fn((format: string) => {
    if (format === "raw") return Promise.resolve(MOCK_RAW_PUB.buffer.slice(0) as ArrayBuffer);
    if (format === "pkcs8") return Promise.resolve(MOCK_PKCS8.buffer.slice(0) as ArrayBuffer);
    return Promise.resolve(new ArrayBuffer(0));
  }),
  sign: jest.fn().mockResolvedValue(MOCK_SIG.buffer.slice(0) as ArrayBuffer),
  digest: jest.fn().mockResolvedValue(MOCK_DIGEST_BYTES.buffer.slice(0) as ArrayBuffer),
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
  mockSubtle.generateKey.mockResolvedValue({ privateKey: mockPrivateKey, publicKey: mockPublicKey });
  mockSubtle.exportKey.mockImplementation((format: string) => {
    if (format === "raw") return Promise.resolve(MOCK_RAW_PUB.buffer.slice(0) as ArrayBuffer);
    if (format === "pkcs8") return Promise.resolve(MOCK_PKCS8.buffer.slice(0) as ArrayBuffer);
    return Promise.resolve(new ArrayBuffer(0));
  });
  mockSubtle.sign.mockResolvedValue(MOCK_SIG.buffer.slice(0) as ArrayBuffer);
  mockSubtle.digest.mockResolvedValue(MOCK_DIGEST_BYTES.buffer.slice(0) as ArrayBuffer);
  mockSubtle.importKey.mockResolvedValue(mockPrivateKey);
  mockDiscoverOrganizationAndWalletId.mockResolvedValue({
    organizationId: "org-rn-int-123",
    walletId: "wallet-rn-int-456",
  });
  mockCreateConnectStartUrl.mockResolvedValue("https://auth.example.com/login/start?state=rn-int-session-1");
  jest.clearAllMocks();
});

import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { ExpoAuth2Stamper } from "./ExpoAuth2Stamper";
import { ExpoAuth2AuthProvider } from "./ExpoAuth2AuthProvider";
import { exchangeAuthCode } from "@phantom/auth2";

const AUTH2_OPTIONS = {
  clientId: "rn-int-client-id",
  redirectUri: "myapp://callback",
  connectLoginUrl: "https://auth.example.com/login/start",
  authApiBaseUrl: "https://auth.example.com",
};
const KMS_OPTIONS = { apiBaseUrl: "https://kms.example.com", appId: "rn-int-app" };

const CONNECT_OPTIONS = {
  publicKey: "7EcDshMsTHCs2f2HU2a3n36x9JkEVVenF9oQQGy5U3s",
  appId: "rn-int-app",
  sessionId: "rn-int-session-1",
  provider: "google" as const,
  redirectUrl: "myapp://callback",
};

function buildCallbackUrl(params: Record<string, string>) {
  const url = new URL("myapp://callback");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

type StamperArg = ConstructorParameters<typeof ExpoAuth2AuthProvider>[0];

function makeProvider(stamper: ExpoAuth2Stamper) {
  return new ExpoAuth2AuthProvider(stamper as unknown as StamperArg, AUTH2_OPTIONS, KMS_OPTIONS);
}

describe("ExpoAuth2 React Native flow — end-to-end", () => {
  beforeEach(() => {
    (WebBrowser.warmUpAsync as jest.Mock).mockResolvedValue(undefined);
    (WebBrowser.coolDownAsync as jest.Mock).mockResolvedValue(undefined);
    // Default: successful authentication callback.
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: "success",
      url: buildCallbackUrl({ code: "rn-auth-code", state: "rn-int-session-1" }),
    });
    // SecureStore starts empty by default.
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  it("full connect flow: stamper init → authenticate → AuthResult", async () => {
    const stamper = new ExpoAuth2Stamper("phantom-auth2-rn-int");
    const provider = makeProvider(stamper);

    const result = await provider.authenticate(CONNECT_OPTIONS);

    // Stamper was initialised as part of authenticate.
    expect(stamper.getKeyInfo()).not.toBeNull();

    // AuthResult is fully populated.
    expect(result).toEqual({
      walletId: "wallet-rn-int-456",
      organizationId: "org-rn-int-123",
      provider: "google",
      accountDerivationIndex: 0,
      expiresInMs: 7_200_000,
      authUserId: "rn-int-user-1",
      bearerToken: "Bearer rn-int-id-token",
    });
  });

  it("exchanges the authorization code from the callback URL", async () => {
    const stamper = new ExpoAuth2Stamper("phantom-auth2-rn-code");
    const provider = makeProvider(stamper);
    await provider.authenticate(CONNECT_OPTIONS);

    expect(exchangeAuthCode).toHaveBeenCalledWith(expect.objectContaining({ code: "rn-auth-code" }));
  });

  it("calls createConnectStartUrl with the stamper's CryptoKeyPair and connect options", async () => {
    const stamper = new ExpoAuth2Stamper("phantom-auth2-rn-url");
    const provider = makeProvider(stamper);
    await provider.authenticate(CONNECT_OPTIONS);

    expect(mockCreateConnectStartUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        keyPair: stamper.getCryptoKeyPair(),
        connectLoginUrl: AUTH2_OPTIONS.connectLoginUrl,
        clientId: AUTH2_OPTIONS.clientId,
        redirectUri: AUTH2_OPTIONS.redirectUri,
        sessionId: CONNECT_OPTIONS.sessionId,
        provider: CONNECT_OPTIONS.provider,
      }),
    );
  });

  it("passes the URL returned by createConnectStartUrl to openAuthSessionAsync", async () => {
    const mockUrl = "https://auth.example.com/login/start?foo=bar";
    mockCreateConnectStartUrl.mockResolvedValueOnce(mockUrl);
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
      type: "success",
      url: buildCallbackUrl({ code: "c", state: "rn-int-session-1" }),
    });

    const stamper = new ExpoAuth2Stamper("phantom-auth2-rn-url-passthrough");
    const provider = makeProvider(stamper);
    await provider.authenticate(CONNECT_OPTIONS);

    const [authUrl] = (WebBrowser.openAuthSessionAsync as jest.Mock).mock.calls[0] as [string, string];
    expect(authUrl).toBe(mockUrl);
  });

  it("getCryptoKeyPair() returns a CryptoKeyPair after stamper init", async () => {
    const stamper = new ExpoAuth2Stamper("phantom-auth2-keypair-int");
    expect(stamper.getCryptoKeyPair()).toBeNull();
    await stamper.init();
    const kp = stamper.getCryptoKeyPair();
    expect(kp).not.toBeNull();
    expect(kp!.privateKey).toBe(mockPrivateKey);
    expect(kp!.publicKey).toBe(mockPublicKey);
  });

  it("stamper key persists to SecureStore during authentication", async () => {
    const storageKey = "phantom-auth2-persist-test";
    const stamper = new ExpoAuth2Stamper(storageKey);
    const provider = makeProvider(stamper);
    await provider.authenticate(CONNECT_OPTIONS);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      storageKey,
      expect.stringContaining("privateKeyPkcs8"),
      expect.any(Object),
    );
  });

  it("loads the stored key from SecureStore on re-initialisation (simulates app restart)", async () => {
    // First authenticate — creates and stores the key.
    const storageKey = "phantom-auth2-reload-test";
    const stamper1 = new ExpoAuth2Stamper(storageKey);
    const provider1 = makeProvider(stamper1);
    await provider1.authenticate(CONNECT_OPTIONS);

    const info1 = stamper1.getKeyInfo();
    expect(info1).not.toBeNull();

    // Simulate app restart: SecureStore returns the previously stored record.
    const storedJson = (SecureStore.setItemAsync as jest.Mock).mock.calls.slice(-1)[0][1] as string;
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(storedJson);

    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
      type: "success",
      url: buildCallbackUrl({ code: "second-auth-code", state: "rn-int-session-1" }),
    });

    const stamper2 = new ExpoAuth2Stamper(storageKey);
    const provider2 = makeProvider(stamper2);
    await provider2.authenticate(CONNECT_OPTIONS);

    // Second stamper should reuse the stored key, not generate a new one.
    expect(mockSubtle.generateKey).toHaveBeenCalledTimes(1); // only from the first authenticate
    expect(stamper2.getKeyInfo()?.keyId).toBe(info1!.keyId);
  });

  it("throws and cooldown still runs when user cancels the browser session", async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: "cancel" });

    const stamper = new ExpoAuth2Stamper("phantom-auth2-cancel");
    const provider = makeProvider(stamper);

    await expect(provider.authenticate(CONNECT_OPTIONS)).rejects.toThrow("Authentication failed");
    expect(WebBrowser.coolDownAsync).toHaveBeenCalled();
  });

  it("stamp output produced after auth contains OIDC kind with idToken and algorithm", async () => {
    // After authenticate(), the provider calls setIdToken() on the stamper,
    // so subsequent stamps use OIDC format.
    const stamper = new ExpoAuth2Stamper("phantom-auth2-stamp-int");
    const provider = makeProvider(stamper);
    await provider.authenticate(CONNECT_OPTIONS);

    // Stamper is now armed with the id token; produce a direct stamp.
    const stampStr = await stamper.stamp({ type: "OIDC", data: Buffer.from("integration-payload") });
    const decoded = JSON.parse(Buffer.from(stampStr, "base64url").toString()) as {
      kind: string;
      idToken: string;
      publicKey: string;
      algorithm: string;
      salt: string;
      signature: string;
    };

    expect(decoded.kind).toBe("OIDC");
    expect(decoded.idToken).toBe("rn-int-id-token");
    expect(decoded.algorithm).toBe("Secp256r1");
    expect(decoded.salt).toBe("");
    expect(typeof decoded.publicKey).toBe("string");
    expect(typeof decoded.signature).toBe("string");
  });

  it("CSRF: throws when callback state does not match the session ID", async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
      type: "success",
      url: buildCallbackUrl({ code: "c", state: "ATTACKER-SESSION" }),
    });

    const stamper = new ExpoAuth2Stamper("phantom-auth2-csrf");
    const provider = makeProvider(stamper);

    await expect(provider.authenticate(CONNECT_OPTIONS)).rejects.toThrow("CSRF");
  });

  it("KMS org discovery called with bearerToken and authUserId from token exchange", async () => {
    const stamper = new ExpoAuth2Stamper("phantom-auth2-kms");
    const provider = makeProvider(stamper);
    await provider.authenticate(CONNECT_OPTIONS);

    expect(mockDiscoverOrganizationAndWalletId).toHaveBeenCalledWith("Bearer rn-int-id-token", "rn-int-user-1");
  });
});
