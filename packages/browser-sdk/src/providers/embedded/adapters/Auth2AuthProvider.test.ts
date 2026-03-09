const mockDiscoverOrganizationAndWalletId = jest
  .fn()
  .mockResolvedValue({ organizationId: "org-123", walletId: "wallet-456" });
const mockCreateConnectStartUrl = jest
  .fn()
  .mockResolvedValue("https://auth.example.com/login/start?client_id=client-id&state=session-id-1");

jest.mock("@phantom/auth2", () => ({
  createCodeVerifier: jest.fn().mockReturnValue("test-code-verifier"),
  createConnectStartUrl: mockCreateConnectStartUrl,
  exchangeAuthCode: jest.fn().mockResolvedValue({
    idToken: "id-token-value",
    bearerToken: "Bearer id-token-value",
    authUserId: "auth-user-1",
    expiresInMs: 3_600_000,
  }),
  Auth2KmsRpcClient: jest.fn().mockImplementation(() => ({
    discoverOrganizationAndWalletId: mockDiscoverOrganizationAndWalletId,
  })),
}));

import type { StamperWithKeyManagement } from "@phantom/sdk-types";
import type { EmbeddedStorage, URLParamsAccessor } from "@phantom/embedded-provider-core";
import { Auth2AuthProvider } from "./Auth2AuthProvider";
import { createCodeVerifier, createConnectStartUrl, exchangeAuthCode } from "@phantom/auth2";

type TestSession = {
  sessionId: string;
  pkceCodeVerifier?: string;
  bearerToken?: string;
  authUserId?: string;
  walletId?: string;
  organizationId?: string;
  status?: string;
  [key: string]: unknown;
};

function makeStorage(initialSession: TestSession | null = null) {
  let session: TestSession | null = initialSession;
  return {
    getSession: jest.fn().mockImplementation(() => Promise.resolve(session)),
    saveSession: jest.fn().mockImplementation((s: TestSession) => {
      session = s;
      return Promise.resolve();
    }),
    clearSession: jest.fn().mockResolvedValue(undefined),
    getShouldClearPreviousSession: jest.fn().mockResolvedValue(false),
    setShouldClearPreviousSession: jest.fn().mockResolvedValue(undefined),
  };
}

function makeUrlParams(params: Record<string, string | null> = {}) {
  return {
    getParam: jest.fn((key: string) => params[key] ?? null),
  };
}

const mockCryptoKeyPair: CryptoKeyPair = {
  privateKey: { type: "private", algorithm: { name: "ECDSA" } } as CryptoKey,
  publicKey: { type: "public", algorithm: { name: "ECDSA" } } as CryptoKey,
};

function makeStamper(initialized = true) {
  return {
    stamp: jest.fn().mockResolvedValue("mock-stamp"),
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

const AUTH2_OPTIONS = {
  clientId: "client-id",
  redirectUri: "https://app.example.com/callback",
  connectLoginUrl: "https://auth.example.com/login/start",
  authApiBaseUrl: "https://auth.example.com",
};

const KMS_OPTIONS = {
  apiBaseUrl: "https://kms.example.com",
  appId: "app-id",
};

function makeProvider(
  storage = makeStorage({ sessionId: "session-id-1" }),
  urlParams = makeUrlParams(),
  stamper = makeStamper(),
) {
  return new Auth2AuthProvider(
    stamper as unknown as StamperWithKeyManagement,
    storage as unknown as EmbeddedStorage,
    urlParams as unknown as URLParamsAccessor,
    AUTH2_OPTIONS,
    KMS_OPTIONS,
  );
}

describe("Auth2AuthProvider.authenticate()", () => {
  const connectOptions = {
    publicKey: "7EcDshMsTHCs2f2HU2a3n36x9JkEVVenF9oQQGy5U3s",
    appId: "app-id",
    sessionId: "session-id-1",
    provider: "google" as const,
    redirectUrl: "https://app.example.com/callback",
  };

  let navigateSpy: jest.SpyInstance;

  beforeEach(() => {
    navigateSpy = jest.spyOn(Auth2AuthProvider, "navigate").mockImplementation(() => {});
  });

  afterEach(() => {
    navigateSpy.mockRestore();
  });

  it("creates a PKCE code verifier", async () => {
    await makeProvider().authenticate(connectOptions);

    expect(createCodeVerifier).toHaveBeenCalled();
  });

  it("calls createConnectStartUrl with the correct options", async () => {
    await makeProvider().authenticate(connectOptions);

    expect(createConnectStartUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        keyPair: mockCryptoKeyPair,
        connectLoginUrl: AUTH2_OPTIONS.connectLoginUrl,
        clientId: AUTH2_OPTIONS.clientId,
        redirectUri: AUTH2_OPTIONS.redirectUri,
        sessionId: connectOptions.sessionId,
        provider: connectOptions.provider,
        codeVerifier: "test-code-verifier",
        salt: "",
      }),
    );
  });

  it("saves pkceCodeVerifier into the existing session", async () => {
    const session: TestSession = { sessionId: "session-id-1" };
    const storage = makeStorage(session);

    await makeProvider(storage).authenticate(connectOptions);

    expect(storage.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({ pkceCodeVerifier: "test-code-verifier" }),
    );
  });

  it("throws when no session exists", async () => {
    const storage = makeStorage(null); // no session

    await expect(makeProvider(storage).authenticate(connectOptions)).rejects.toThrow("Session not found.");
  });

  it("navigates to the URL returned by createConnectStartUrl", async () => {
    const expectedUrl = "https://auth.example.com/login/start?foo=bar";
    mockCreateConnectStartUrl.mockResolvedValueOnce(expectedUrl);

    await makeProvider().authenticate(connectOptions);

    expect(navigateSpy).toHaveBeenCalledWith(expectedUrl);
  });

  it("calls stamper.init() when getKeyInfo() returns null", async () => {
    const stamper = makeStamper(false);

    await makeProvider(undefined, undefined, stamper).authenticate(connectOptions);

    expect(stamper.init).toHaveBeenCalled();
  });

  it("does not call stamper.init() when getKeyInfo() returns a value", async () => {
    const stamper = makeStamper(true);

    await makeProvider(undefined, undefined, stamper).authenticate(connectOptions);

    expect(stamper.init).not.toHaveBeenCalled();
  });

  it("throws when getCryptoKeyPair() returns null", async () => {
    const stamper = makeStamper(true);
    stamper.getCryptoKeyPair.mockReturnValue(null);

    await expect(makeProvider(undefined, undefined, stamper).authenticate(connectOptions)).rejects.toThrow(
      "Stamper key pair not found.",
    );
  });

  it("passes provider=google to createConnectStartUrl", async () => {
    await makeProvider().authenticate({ ...connectOptions, provider: "google" });

    expect(createConnectStartUrl).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));
  });

  it("passes provider=apple to createConnectStartUrl", async () => {
    await makeProvider().authenticate({ ...connectOptions, provider: "apple" });

    expect(createConnectStartUrl).toHaveBeenCalledWith(expect.objectContaining({ provider: "apple" }));
  });

  it("passes provider=phantom to createConnectStartUrl", async () => {
    await makeProvider().authenticate({ ...connectOptions, provider: "phantom" });

    expect(createConnectStartUrl).toHaveBeenCalledWith(expect.objectContaining({ provider: "phantom" }));
  });

  it("passes provider=device to createConnectStartUrl", async () => {
    await makeProvider().authenticate({ ...connectOptions, provider: "device" });

    expect(createConnectStartUrl).toHaveBeenCalledWith(expect.objectContaining({ provider: "device" }));
  });
});

describe("Auth2AuthProvider.resumeAuthFromRedirect()", () => {
  const SESSION: TestSession = {
    sessionId: "session-abc",
    pkceCodeVerifier: "verifier-xyz",
  };

  function makeSuccessProvider() {
    return makeProvider(makeStorage({ ...SESSION }), makeUrlParams({ code: "auth-code", state: "session-abc" }));
  }

  it("returns null when the URL has no 'code' param", async () => {
    const provider = makeProvider(makeStorage(SESSION), makeUrlParams({}));

    expect(await provider.resumeAuthFromRedirect("google")).toBeNull();
  });

  it("throws when no session exists and a code is present in the URL", async () => {
    const provider = makeProvider(makeStorage(null), makeUrlParams({ code: "auth-code" }));

    await expect(provider.resumeAuthFromRedirect("google")).rejects.toThrow("Session not found.");
  });

  it("returns null when the session has no pkceCodeVerifier", async () => {
    const session = { sessionId: "s1" }; // no pkceCodeVerifier
    const provider = makeProvider(makeStorage(session), makeUrlParams({ code: "code", state: "s1" }));

    expect(await provider.resumeAuthFromRedirect("google")).toBeNull();
  });

  it("calls stamper.init() when the stamper is not yet loaded", async () => {
    const stamper = makeStamper(false); // not initialized
    const provider = makeProvider(
      makeStorage({ ...SESSION }),
      makeUrlParams({ code: "c", state: "session-abc" }),
      stamper,
    );

    await provider.resumeAuthFromRedirect("google");

    expect(stamper.init).toHaveBeenCalled();
  });

  it("does not call stamper.init() when the stamper is already loaded", async () => {
    const stamper = makeStamper(true);
    const provider = makeProvider(
      makeStorage({ ...SESSION }),
      makeUrlParams({ code: "c", state: "session-abc" }),
      stamper,
    );

    await provider.resumeAuthFromRedirect("google");

    expect(stamper.init).not.toHaveBeenCalled();
  });

  it("throws on state mismatch (CSRF protection)", async () => {
    const provider = makeProvider(makeStorage({ ...SESSION }), makeUrlParams({ code: "c", state: "WRONG-state" }));

    await expect(provider.resumeAuthFromRedirect("google")).rejects.toThrow("CSRF");
  });

  it("throws when the callback URL contains an error param", async () => {
    const provider = makeProvider(
      makeStorage({ ...SESSION }),
      makeUrlParams({ code: "c", state: "session-abc", error: "access_denied", error_description: "User denied" }),
    );

    await expect(provider.resumeAuthFromRedirect("google")).rejects.toThrow("User denied");
  });

  it("throws when error param is present but error_description is absent", async () => {
    const provider = makeProvider(
      makeStorage({ ...SESSION }),
      makeUrlParams({ code: "c", state: "session-abc", error: "server_error" }),
    );

    await expect(provider.resumeAuthFromRedirect("google")).rejects.toThrow("server_error");
  });

  it("calls exchangeAuthCode with options from the session and URL", async () => {
    await makeSuccessProvider().resumeAuthFromRedirect("google");

    expect(exchangeAuthCode).toHaveBeenCalledWith({
      authApiBaseUrl: AUTH2_OPTIONS.authApiBaseUrl,
      clientId: AUTH2_OPTIONS.clientId,
      redirectUri: AUTH2_OPTIONS.redirectUri,
      code: "auth-code",
      codeVerifier: "verifier-xyz",
    });
  });

  it("saves bearerToken, authUserId, status=completed to the session and clears pkceCodeVerifier", async () => {
    const storage = makeStorage({ ...SESSION });
    const provider = makeProvider(storage, makeUrlParams({ code: "c", state: "session-abc" }));

    await provider.resumeAuthFromRedirect("google");

    expect(storage.saveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        bearerToken: "Bearer id-token-value",
        authUserId: "auth-user-1",
        pkceCodeVerifier: undefined,
        status: "completed",
      }),
    );
  });

  it("calls setIdToken with the idToken after successful token exchange", async () => {
    const stamper = makeStamper(true);
    const provider = makeProvider(
      makeStorage({ ...SESSION }),
      makeUrlParams({ code: "c", state: "session-abc" }),
      stamper,
    );

    await provider.resumeAuthFromRedirect("google");

    expect(stamper.setIdToken).toHaveBeenCalledWith("id-token-value");
  });

  it("returns a complete AuthResult on success", async () => {
    const result = await makeSuccessProvider().resumeAuthFromRedirect("google");

    expect(result).toEqual({
      walletId: "wallet-456",
      organizationId: "org-123",
      provider: "google",
      accountDerivationIndex: 0,
      expiresInMs: 3_600_000,
      authUserId: "auth-user-1",
      bearerToken: "Bearer id-token-value",
    });
  });

  it("throws when KMS returns no organizationId", async () => {
    mockDiscoverOrganizationAndWalletId.mockRejectedValueOnce(new Error("Unable to resolve organizationId"));

    await expect(makeSuccessProvider().resumeAuthFromRedirect("google")).rejects.toThrow(
      "Unable to resolve organizationId",
    );
  });

  it("throws when KMS returns no walletId", async () => {
    mockDiscoverOrganizationAndWalletId.mockRejectedValueOnce(new Error("Unable to resolve walletId"));

    await expect(makeSuccessProvider().resumeAuthFromRedirect("google")).rejects.toThrow("Unable to resolve walletId");
  });

  it("passes authUserId to discoverOrganizationAndWalletId", async () => {
    await makeSuccessProvider().resumeAuthFromRedirect("google");

    expect(mockDiscoverOrganizationAndWalletId).toHaveBeenCalledWith("Bearer id-token-value", "auth-user-1");
  });

  it("throws when state param is absent (CSRF protection requires state)", async () => {
    const provider = makeProvider(
      makeStorage({ ...SESSION }),
      makeUrlParams({ code: "c" }), // no state param
    );

    await expect(provider.resumeAuthFromRedirect("google")).rejects.toThrow("Missing or invalid Auth2 state parameter");
  });
});
