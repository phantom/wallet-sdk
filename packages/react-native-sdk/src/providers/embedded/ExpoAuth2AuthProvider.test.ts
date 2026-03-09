const mockDiscoverOrganizationAndWalletId = jest
  .fn()
  .mockResolvedValue({ organizationId: "org-rn-123", walletId: "wallet-rn-456" });
const mockCreateConnectStartUrl = jest
  .fn()
  .mockResolvedValue(
    "https://auth.example.com/login/start?client_id=rn-client-id&redirect_uri=myapp%3A%2F%2Fcallback&response_type=code&scope=openid&nonce=rn-nonce&state=rn-session-1&code_challenge=rn-code-challenge&code_challenge_method=S256",
  );

jest.mock("@phantom/auth2", () => ({
  createCodeVerifier: jest.fn().mockReturnValue("rn-code-verifier"),
  createConnectStartUrl: mockCreateConnectStartUrl,
  exchangeAuthCode: jest.fn().mockResolvedValue({
    idToken: "rn-id-token",
    bearerToken: "Bearer rn-id-token",
    authUserId: "rn-user-1",
    expiresInMs: 7_200_000,
  }),
  Auth2KmsRpcClient: jest.fn().mockImplementation(() => ({
    discoverOrganizationAndWalletId: mockDiscoverOrganizationAndWalletId,
  })),
}));

import type { AuthResult } from "@phantom/embedded-provider-core";
import * as WebBrowser from "expo-web-browser";
import { ExpoAuth2AuthProvider } from "./ExpoAuth2AuthProvider";
import { createCodeVerifier, createConnectStartUrl, exchangeAuthCode } from "@phantom/auth2";

const AUTH2_OPTIONS = {
  clientId: "rn-client-id",
  redirectUri: "myapp://callback",
  connectLoginUrl: "https://auth.example.com/login/start",
  authApiBaseUrl: "https://auth.example.com",
};

const KMS_OPTIONS = { apiBaseUrl: "https://kms.example.com", appId: "rn-app" };

const mockCryptoKeyPair: CryptoKeyPair = {
  privateKey: { type: "private", algorithm: { name: "ECDSA" } } as CryptoKey,
  publicKey: { type: "public", algorithm: { name: "ECDSA" } } as CryptoKey,
};

function makeStamper(initialized = true) {
  return {
    stamp: jest.fn().mockResolvedValue("rn-mock-stamp"),
    getKeyInfo: jest
      .fn()
      .mockReturnValue(
        initialized
          ? { keyId: "k1", publicKey: "7EcDshMsTHCs2f2HU2a3n36x9JkEVVenF9oQQGy5U3s", createdAt: Date.now() }
          : null,
      ),
    getCryptoKeyPair: jest.fn().mockReturnValue(mockCryptoKeyPair),
    init: jest.fn().mockResolvedValue({
      keyId: "k1",
      publicKey: "7EcDshMsTHCs2f2HU2a3n36x9JkEVVenF9oQQGy5U3s",
      createdAt: Date.now(),
    }),
    setIdToken: jest.fn().mockResolvedValue(undefined),
    rotateKeyPair: jest.fn(),
    commitRotation: jest.fn(),
    rollbackRotation: jest.fn(),
    resetKeyPair: jest.fn(),
    clear: jest.fn(),
    algorithm: "ECDSA_P256",
    type: "OIDC" as "PKI" | "OIDC",
  };
}

type StamperArg = ConstructorParameters<typeof ExpoAuth2AuthProvider>[0];

function makeProvider(stamper = makeStamper()) {
  return new ExpoAuth2AuthProvider(stamper as unknown as StamperArg, AUTH2_OPTIONS, KMS_OPTIONS);
}

function successResult(callbackUrl: string) {
  return { type: "success" as const, url: callbackUrl };
}

function callbackUrl(params: Record<string, string> = {}) {
  const url = new URL("myapp://callback");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

const CONNECT_OPTIONS = {
  publicKey: "7EcDshMsTHCs2f2HU2a3n36x9JkEVVenF9oQQGy5U3s",
  appId: "rn-app",
  sessionId: "rn-session-1",
  provider: "google" as const,
  redirectUrl: "myapp://callback",
};

describe("ExpoAuth2AuthProvider.authenticate()", () => {
  beforeEach(() => {
    (WebBrowser.warmUpAsync as jest.Mock).mockResolvedValue(undefined);
    (WebBrowser.coolDownAsync as jest.Mock).mockResolvedValue(undefined);
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue(
      successResult(callbackUrl({ code: "auth-code", state: "rn-session-1" })),
    );
    mockCreateConnectStartUrl.mockResolvedValue(
      "https://auth.example.com/login/start?client_id=rn-client-id&redirect_uri=myapp%3A%2F%2Fcallback&response_type=code&scope=openid&nonce=rn-nonce&state=rn-session-1&code_challenge=rn-code-challenge&code_challenge_method=S256",
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls stamper.init() when the stamper is not yet loaded", async () => {
    const stamper = makeStamper(false);
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce(
      successResult(callbackUrl({ code: "c", state: "rn-session-1" })),
    );

    await makeProvider(stamper).authenticate(CONNECT_OPTIONS);

    expect(stamper.init).toHaveBeenCalled();
  });

  it("skips stamper.init() when the stamper is already loaded", async () => {
    const stamper = makeStamper(true);

    await makeProvider(stamper).authenticate(CONNECT_OPTIONS);

    expect(stamper.init).not.toHaveBeenCalled();
  });

  it("throws when getCryptoKeyPair() returns null", async () => {
    const stamper = makeStamper(true);
    stamper.getCryptoKeyPair.mockReturnValue(null);

    await expect(makeProvider(stamper).authenticate(CONNECT_OPTIONS)).rejects.toThrow("Stamper key pair not found.");
  });

  it("creates a PKCE code verifier", async () => {
    await makeProvider().authenticate(CONNECT_OPTIONS);

    expect(createCodeVerifier).toHaveBeenCalled();
  });

  it("calls createConnectStartUrl with the correct options", async () => {
    await makeProvider().authenticate(CONNECT_OPTIONS);

    expect(createConnectStartUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        keyPair: mockCryptoKeyPair,
        connectLoginUrl: AUTH2_OPTIONS.connectLoginUrl,
        clientId: AUTH2_OPTIONS.clientId,
        redirectUri: AUTH2_OPTIONS.redirectUri,
        sessionId: CONNECT_OPTIONS.sessionId,
        provider: CONNECT_OPTIONS.provider,
        codeVerifier: "rn-code-verifier",
        salt: "",
      }),
    );
  });

  it("calls setIdToken with idToken after successful token exchange", async () => {
    const stamper = makeStamper(true);
    await makeProvider(stamper).authenticate(CONNECT_OPTIONS);

    expect(stamper.setIdToken).toHaveBeenCalledWith("rn-id-token");
  });

  it("passes the createConnectStartUrl result to openAuthSessionAsync", async () => {
    const mockUrl = "https://auth.example.com/login/start?foo=bar";
    mockCreateConnectStartUrl.mockResolvedValueOnce(mockUrl);
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce(
      successResult(callbackUrl({ code: "c", state: "rn-session-1" })),
    );

    await makeProvider().authenticate(CONNECT_OPTIONS);

    const [authUrl] = (WebBrowser.openAuthSessionAsync as jest.Mock).mock.calls[0] as [string, string];
    expect(authUrl).toBe(mockUrl);
  });

  it("passes the redirectUri as the second argument to openAuthSessionAsync", async () => {
    await makeProvider().authenticate(CONNECT_OPTIONS);

    const [, redirectArg] = (WebBrowser.openAuthSessionAsync as jest.Mock).mock.calls[0] as [string, string];
    expect(redirectArg).toBe("myapp://callback");
  });

  it("passes provider=google to createConnectStartUrl", async () => {
    await makeProvider().authenticate({ ...CONNECT_OPTIONS, provider: "google" });

    expect(createConnectStartUrl).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));
  });

  it("passes provider=apple to createConnectStartUrl", async () => {
    await makeProvider().authenticate({ ...CONNECT_OPTIONS, provider: "apple" });

    expect(createConnectStartUrl).toHaveBeenCalledWith(expect.objectContaining({ provider: "apple" }));
  });

  it("passes provider=phantom to createConnectStartUrl", async () => {
    await makeProvider().authenticate({ ...CONNECT_OPTIONS, provider: "phantom" });

    expect(createConnectStartUrl).toHaveBeenCalledWith(expect.objectContaining({ provider: "phantom" }));
  });

  it("passes provider=device to createConnectStartUrl", async () => {
    await makeProvider().authenticate({ ...CONNECT_OPTIONS, provider: "device" });

    expect(createConnectStartUrl).toHaveBeenCalledWith(expect.objectContaining({ provider: "device" }));
  });

  it("calls warmUpAsync before and coolDownAsync after the browser session", async () => {
    await makeProvider().authenticate(CONNECT_OPTIONS);

    expect(WebBrowser.warmUpAsync).toHaveBeenCalled();
    expect(WebBrowser.coolDownAsync).toHaveBeenCalled();
  });

  it("always calls coolDownAsync even when openAuthSessionAsync throws", async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockRejectedValueOnce(new Error("browser crash"));
    await expect(makeProvider().authenticate(CONNECT_OPTIONS)).rejects.toThrow("browser crash");

    expect(WebBrowser.coolDownAsync).toHaveBeenCalled();
  });

  it("throws when the user cancels authentication", async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: "cancel" });

    await expect(makeProvider().authenticate(CONNECT_OPTIONS)).rejects.toThrow("Authentication failed");
  });

  it("throws when the browser result type is not 'success'", async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: "dismiss" });

    await expect(makeProvider().authenticate(CONNECT_OPTIONS)).rejects.toThrow("Authentication failed");
  });

  it("throws when the result URL is absent on a success result", async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: "success", url: "" });

    await expect(makeProvider().authenticate(CONNECT_OPTIONS)).rejects.toThrow("Authentication failed");
  });

  it("throws on state mismatch (CSRF protection)", async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce(
      successResult(callbackUrl({ code: "c", state: "WRONG" })),
    );

    await expect(makeProvider().authenticate(CONNECT_OPTIONS)).rejects.toThrow("CSRF");
  });

  it("throws when error param is present in the callback URL", async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce(
      successResult(callbackUrl({ error: "access_denied", error_description: "User denied", state: "rn-session-1" })),
    );

    await expect(makeProvider().authenticate(CONNECT_OPTIONS)).rejects.toThrow("User denied");
  });

  it("uses the error param value when error_description is absent", async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce(
      successResult(callbackUrl({ error: "server_error", state: "rn-session-1" })),
    );

    await expect(makeProvider().authenticate(CONNECT_OPTIONS)).rejects.toThrow("server_error");
  });

  it("throws when code param is missing from the callback URL", async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce(
      successResult(callbackUrl({ state: "rn-session-1" })), // no code
    );

    await expect(makeProvider().authenticate(CONNECT_OPTIONS)).rejects.toThrow("missing authorization code");
  });

  it("proceeds without CSRF error when state is absent", async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce(
      successResult(callbackUrl({ code: "c" })), // no state
    );

    await expect(makeProvider().authenticate(CONNECT_OPTIONS)).resolves.not.toBeNull();
  });

  it("exchanges the authorization code using exchangeAuthCode", async () => {
    await makeProvider().authenticate(CONNECT_OPTIONS);

    expect(exchangeAuthCode).toHaveBeenCalledWith({
      authApiBaseUrl: AUTH2_OPTIONS.authApiBaseUrl,
      clientId: AUTH2_OPTIONS.clientId,
      redirectUri: AUTH2_OPTIONS.redirectUri,
      code: "auth-code",
      codeVerifier: "rn-code-verifier",
    });
  });

  it("throws when KMS returns no organizationId", async () => {
    mockDiscoverOrganizationAndWalletId.mockRejectedValueOnce(new Error("Unable to resolve organizationId"));

    await expect(makeProvider().authenticate(CONNECT_OPTIONS)).rejects.toThrow("Unable to resolve organizationId");
  });

  it("throws when KMS returns no walletId", async () => {
    mockDiscoverOrganizationAndWalletId.mockRejectedValueOnce(new Error("Unable to resolve walletId"));

    await expect(makeProvider().authenticate(CONNECT_OPTIONS)).rejects.toThrow("Unable to resolve walletId");
  });

  it("returns a complete AuthResult including bearerToken", async () => {
    const result = await makeProvider().authenticate(CONNECT_OPTIONS);

    expect(result).toEqual({
      walletId: "wallet-rn-456",
      organizationId: "org-rn-123",
      provider: "google",
      accountDerivationIndex: 0,
      expiresInMs: 7_200_000,
      authUserId: "rn-user-1",
      bearerToken: "Bearer rn-id-token",
    });
  });

  it("passes authUserId to discoverOrganizationAndWalletId", async () => {
    await makeProvider().authenticate(CONNECT_OPTIONS);

    expect(mockDiscoverOrganizationAndWalletId).toHaveBeenCalledWith("Bearer rn-id-token", "rn-user-1");
  });

  it("uses the provider from connectOptions in the AuthResult", async () => {
    const result = await makeProvider().authenticate({ ...CONNECT_OPTIONS, provider: "apple" });

    expect((result as AuthResult)?.provider).toBe("apple");
  });
});
