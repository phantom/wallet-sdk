const MOCK_COORD_BYTES = new Uint8Array(32).fill(0x00);

const mockBase64urlEncode = jest.fn((data: Uint8Array) => Buffer.from(data).toString("base64url"));
const mockBase64urlDecode = jest.fn((_data: string) => MOCK_COORD_BYTES);
jest.mock("@phantom/base64url", () => ({
  base64urlEncode: mockBase64urlEncode,
  base64urlDecode: mockBase64urlDecode,
}));

const mockSha256 = jest.fn(
  async (_data: Uint8Array): Promise<ArrayBuffer> => new Uint8Array(32).fill(0xab).buffer as ArrayBuffer,
);
jest.mock("@phantom/crypto", () => ({ sha256: mockSha256 }));

const MOCK_RAW_PUB = new Uint8Array([0x04, ...Array(64).fill(0x01)]);
const MOCK_SIGNATURE = new Uint8Array(64).fill(0x55);
const MOCK_JWK = {
  kty: "EC",
  crv: "P-256",
  x: Buffer.from(MOCK_COORD_BYTES).toString("base64url"),
  y: Buffer.from(MOCK_COORD_BYTES).toString("base64url"),
};

const mockPrivateCryptoKey = { type: "private", algorithm: { name: "ECDSA" } } as CryptoKey;
const mockPublicCryptoKey = { type: "public", algorithm: { name: "ECDSA" } } as CryptoKey;

const mockSubtle = {
  exportKey: jest.fn((format: string) => {
    if (format === "raw") return Promise.resolve(MOCK_RAW_PUB.buffer.slice(0) as ArrayBuffer);
    if (format === "jwk") return Promise.resolve(MOCK_JWK);
    return Promise.resolve(new ArrayBuffer(0));
  }),
  sign: jest.fn().mockResolvedValue(MOCK_SIGNATURE.buffer.slice(0) as ArrayBuffer),
};

import {
  createCodeVerifier,
  createSalt,
  createConnectStartUrl,
  exchangeAuthCode,
  _createCodeChallenge,
  _deriveNonce,
  _parseJwtClaim,
} from "../index";

/** Builds a well-formed (but unsigned) JWT with the given payload. */
function makeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.sig`;
}

describe("createCodeVerifier", () => {
  it("calls crypto.getRandomValues with a 64-byte buffer", () => {
    const spy = jest.spyOn(globalThis.crypto, "getRandomValues");

    createCodeVerifier();

    expect(spy).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect((spy.mock.calls[0][0] as Uint8Array).length).toBe(64);

    spy.mockRestore();
  });

  it("passes the random bytes to base64urlEncode", () => {
    mockBase64urlEncode.mockReturnValueOnce("encoded-verifier");

    const result = createCodeVerifier();

    expect(mockBase64urlEncode).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(result).toBe("encoded-verifier");
  });

  it("limits the result to at most 96 characters", () => {
    mockBase64urlEncode.mockReturnValueOnce("x".repeat(200));

    expect(createCodeVerifier()).toHaveLength(96);
  });

  it("returns a string of the encoded length when shorter than 96 chars", () => {
    mockBase64urlEncode.mockReturnValueOnce("short");

    expect(createCodeVerifier()).toBe("short");
  });

  it("produces different values across calls due to randomness", () => {
    // Use real base64urlEncode for this assertion.
    mockBase64urlEncode.mockImplementation((d: Uint8Array) => Buffer.from(d).toString("base64url"));

    const v1 = createCodeVerifier();
    const v2 = createCodeVerifier();

    expect(v1).not.toBe(v2);
  });
});

describe("createConnectStartUrl", () => {
  const mockKeyPair: CryptoKeyPair = {
    privateKey: mockPrivateCryptoKey,
    publicKey: mockPublicCryptoKey,
  };

  const baseInput = {
    keyPair: mockKeyPair,
    connectLoginUrl: "https://auth.example.com/login/start",
    clientId: "my-client",
    redirectUri: "https://app.example.com/callback",
    sessionId: "session-xyz",
    provider: "google",
    codeVerifier: "test-code-verifier",
    salt: "test-salt",
  };

  beforeEach(() => {
    Object.defineProperty(globalThis.crypto, "subtle", {
      value: mockSubtle,
      writable: true,
      configurable: true,
    });
    mockSubtle.exportKey.mockImplementation((format: string) => {
      if (format === "raw") return Promise.resolve(MOCK_RAW_PUB.buffer.slice(0) as ArrayBuffer);
      if (format === "jwk") return Promise.resolve(MOCK_JWK);
      return Promise.resolve(new ArrayBuffer(0));
    });
    mockSubtle.sign.mockResolvedValue(MOCK_SIGNATURE.buffer.slice(0) as ArrayBuffer);

    mockBase64urlEncode.mockImplementation((data: Uint8Array) => Buffer.from(data).toString("base64url"));
    mockBase64urlDecode.mockImplementation((_data: string) => MOCK_COORD_BYTES);
    mockSha256.mockImplementation(
      async (_data: Uint8Array): Promise<ArrayBuffer> => new Uint8Array(32).fill(0xab).buffer as ArrayBuffer,
    );
  });

  it("returns a URL string with the connectLoginUrl as the origin+path", async () => {
    const result = await createConnectStartUrl(baseInput);

    const url = new URL(result);
    expect(url.origin + url.pathname).toBe("https://auth.example.com/login/start");
  });

  /** Decodes the JAR payload from a createConnectStartUrl result. */
  function decodeJarPayload(result: string): Record<string, unknown> {
    const url = new URL(result);
    const hashParams = new URLSearchParams(url.hash.slice(1));
    const jar = hashParams.get("jar")!;
    const parts = jar.split(".");
    return JSON.parse(Buffer.from(parts[1], "base64url").toString()) as Record<string, unknown>;
  }

  it("has no query parameters", async () => {
    const result = await createConnectStartUrl(baseInput);

    expect(new URL(result).search).toBe("");
  });

  it("encodes all required fields in the JAR payload", async () => {
    const result = await createConnectStartUrl(baseInput);

    const payload = decodeJarPayload(result);

    expect(payload).toEqual({
      aud: "https://auth.example.com/login/start",
      iat: expect.any(Number),
      exp: expect.any(Number),
      client_id: "my-client",
      redirect_uri: "https://app.example.com/callback",
      scope: "openid",
      nonce: expect.any(String),
      code_challenge: expect.any(String),
      code_challenge_method: "S256",
      state: "session-xyz",
      login_hint: "google:auth2",
    });
  });

  it("adds login_hint in the JAR payload for non-phantom/non-device provider", async () => {
    const result = await createConnectStartUrl({ ...baseInput, provider: "google" });

    expect(decodeJarPayload(result).login_hint).toBe("google:auth2");
  });

  it("adds login_hint in the JAR payload for apple provider", async () => {
    const result = await createConnectStartUrl({ ...baseInput, provider: "apple" });

    expect(decodeJarPayload(result).login_hint).toBe("apple:auth2");
  });

  it("omits login_hint from JAR payload for phantom provider", async () => {
    const result = await createConnectStartUrl({ ...baseInput, provider: "phantom" });

    expect(decodeJarPayload(result).login_hint).toBeUndefined();
  });

  it("omits login_hint from JAR payload for device provider", async () => {
    const result = await createConnectStartUrl({ ...baseInput, provider: "device" });

    expect(decodeJarPayload(result).login_hint).toBeUndefined();
  });

  it("embeds the JAR in the URL hash as jar=<token>", async () => {
    const result = await createConnectStartUrl(baseInput);

    expect(new URL(result).hash).toMatch(/^#jar=/);
  });

  it("exports the public key in raw format to derive the nonce", async () => {
    await createConnectStartUrl(baseInput);

    expect(mockSubtle.exportKey).toHaveBeenCalledWith("raw", mockPublicCryptoKey);
  });

  it("signs the JAR with the private key", async () => {
    await createConnectStartUrl(baseInput);

    expect(mockSubtle.sign).toHaveBeenCalledWith(
      { name: "ECDSA", hash: "SHA-256" },
      mockPrivateCryptoKey,
      expect.any(Uint8Array),
    );
  });
});

describe("exchangeAuthCode", () => {
  const baseOptions = {
    authApiBaseUrl: "https://auth.example.com",
    clientId: "client-id",
    redirectUri: "https://app.example.com/cb",
    code: "auth-code",
    codeVerifier: "code-verifier",
  };

  function mockFetch(): jest.Mock {
    return globalThis.fetch as jest.Mock;
  }

  it("POSTs to /oauth2/token with form-encoded body", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id_token: makeJwt({ sub: "u1" }), token_type: "Bearer", expires_in: 3600 }),
    });

    await exchangeAuthCode(baseOptions);

    const [url, init] = mockFetch().mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://auth.example.com/oauth2/token");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/x-www-form-urlencoded");

    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("client_id")).toBe("client-id");
    expect(body.get("redirect_uri")).toBe("https://app.example.com/cb");
    expect(body.get("code")).toBe("auth-code");
    expect(body.get("code_verifier")).toBe("code-verifier");
  });

  it("returns idToken, bearerToken, authUserId, and expiresInMs on success", async () => {
    const idToken = makeJwt({ auth_user_id: "auth-789" });
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id_token: idToken, token_type: "Bearer", expires_in: 7200 }),
    });

    const result = await exchangeAuthCode(baseOptions);

    expect(result.idToken).toBe(idToken);
    expect(result.bearerToken).toBe(`Bearer ${idToken}`);
    expect(result.authUserId).toBe("auth-789");
    expect(result.expiresInMs).toBe(7200 * 1000);
  });

  it("prefers auth_user_id claim over authUserId", async () => {
    const idToken = makeJwt({ auth_user_id: "snake-id", authUserId: "camel-id" });
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id_token: idToken, token_type: "Bearer", expires_in: 0 }),
    });

    const result = await exchangeAuthCode(baseOptions);
    expect(result.authUserId).toBe("snake-id");
  });

  it("falls back to authUserId claim when auth_user_id is absent", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id_token: makeJwt({ authUserId: "camel-id" }), token_type: "Bearer", expires_in: 0 }),
    });

    expect((await exchangeAuthCode(baseOptions)).authUserId).toBe("camel-id");
  });

  it("falls back to sub claim when auth_user_id and authUserId are absent", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id_token: makeJwt({ sub: "sub-user" }), token_type: "Bearer", expires_in: 0 }),
    });

    expect((await exchangeAuthCode(baseOptions)).authUserId).toBe("sub-user");
  });

  it("returns authUserId as undefined when no matching claim exists", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id_token: makeJwt({ email: "user@example.com" }),
        token_type: "Bearer",
        expires_in: 0,
      }),
    });

    expect((await exchangeAuthCode(baseOptions)).authUserId).toBeUndefined();
  });

  it("uses token_type from response in bearerToken", async () => {
    const idToken = makeJwt({ sub: "u" });
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id_token: idToken, token_type: "JWT", expires_in: 0 }),
    });

    expect((await exchangeAuthCode(baseOptions)).bearerToken).toBe(`JWT ${idToken}`);
  });

  it("defaults to Bearer when token_type is absent", async () => {
    const idToken = makeJwt({ sub: "u" });
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id_token: idToken }), // no token_type
    });

    expect((await exchangeAuthCode(baseOptions)).bearerToken).toMatch(/^Bearer /);
  });

  it("sets expiresInMs to 0 when expires_in is absent", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id_token: makeJwt({ sub: "u" }) }),
    });

    expect((await exchangeAuthCode(baseOptions)).expiresInMs).toBe(0);
  });

  it("throws with status code and body when response is not ok", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "invalid_grant",
    });

    await expect(exchangeAuthCode(baseOptions)).rejects.toThrow("Auth2 token exchange failed (400 Bad Request)");
  });

  it("throws when id_token is absent from successful response", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: "access", token_type: "Bearer" }),
    });

    await expect(exchangeAuthCode(baseOptions)).rejects.toThrow("did not return an id_token");
  });

  it("returns undefined authUserId for a malformed JWT without throwing", async () => {
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id_token: "not.a.real.jwt", token_type: "Bearer", expires_in: 0 }),
    });

    const result = await exchangeAuthCode(baseOptions);

    expect(result.authUserId).toBeUndefined();
  });

  it("returns undefined authUserId for a JWT with non-string claim value", async () => {
    const idToken = makeJwt({ sub: 12345 }); // number, not string
    mockFetch().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id_token: idToken, token_type: "Bearer", expires_in: 0 }),
    });

    expect((await exchangeAuthCode(baseOptions)).authUserId).toBeUndefined();
  });
});

describe("_parseJwtClaim", () => {
  it("returns null for a token with no dots", () => {
    expect(_parseJwtClaim("nodots", ["sub"])).toBeNull();
  });

  it("returns null for a token with an empty second segment", () => {
    expect(_parseJwtClaim("header.", ["sub"])).toBeNull();
  });

  it("returns null when no requested key is present in the payload", () => {
    expect(_parseJwtClaim(makeJwt({ email: "user@example.com" }), ["sub", "user_id"])).toBeNull();
  });

  it("returns the value of the first matching key", () => {
    expect(_parseJwtClaim(makeJwt({ sub: "user-1", user_id: "user-2" }), ["sub", "user_id"])).toBe("user-1");
  });

  it("skips a key whose value is an empty string and falls through to the next", () => {
    expect(_parseJwtClaim(makeJwt({ sub: "", user_id: "user-2" }), ["sub", "user_id"])).toBe("user-2");
  });

  it("returns null when the matching claim value is not a string", () => {
    expect(_parseJwtClaim(makeJwt({ sub: 12345 }), ["sub"])).toBeNull();
  });

  it("returns null for a token whose payload segment is not valid base64", () => {
    expect(_parseJwtClaim("header.!!!.sig", ["sub"])).toBeNull();
  });

  it("returns null when the key list is empty", () => {
    expect(_parseJwtClaim(makeJwt({ sub: "u" }), [])).toBeNull();
  });
});

describe("_createCodeChallenge", () => {
  beforeEach(() => {
    mockSha256.mockImplementation(
      async (_data: Uint8Array): Promise<ArrayBuffer> => new Uint8Array(32).fill(0xab).buffer as ArrayBuffer,
    );
    mockBase64urlEncode.mockImplementation((data: Uint8Array) => Buffer.from(data).toString("base64url"));
  });

  it("calls sha256 with the UTF-8-encoded verifier bytes", async () => {
    await _createCodeChallenge("my-verifier");

    expect(mockSha256).toHaveBeenCalledWith(new TextEncoder().encode("my-verifier"));
  });

  it("passes the sha256 output to base64urlEncode", async () => {
    await _createCodeChallenge("my-verifier");

    expect(mockBase64urlEncode).toHaveBeenCalled();
  });

  it("returns the base64url-encoded SHA-256 of the verifier", async () => {
    const result = await _createCodeChallenge("my-verifier");

    expect(result).toBe(Buffer.from(new Uint8Array(32).fill(0xab)).toString("base64url"));
  });

  it("produces different outputs for different verifiers (mock passthrough)", async () => {
    mockSha256
      .mockImplementationOnce(async () => new Uint8Array(32).fill(0x01).buffer as ArrayBuffer)
      .mockImplementationOnce(async () => new Uint8Array(32).fill(0x02).buffer as ArrayBuffer);
    mockBase64urlEncode.mockImplementation((data: Uint8Array) => Buffer.from(data).toString("base64url"));

    const a = await _createCodeChallenge("verifier-a");
    const b = await _createCodeChallenge("verifier-b");

    expect(a).not.toBe(b);
  });
});

describe("_deriveNonce", () => {
  const mockKeyPair: CryptoKeyPair = {
    privateKey: mockPrivateCryptoKey,
    publicKey: mockPublicCryptoKey,
  };

  beforeEach(() => {
    Object.defineProperty(globalThis.crypto, "subtle", {
      value: mockSubtle,
      writable: true,
      configurable: true,
    });
    mockSubtle.exportKey.mockImplementation((format: string) => {
      if (format === "raw") return Promise.resolve(MOCK_RAW_PUB.buffer.slice(0) as ArrayBuffer);
      return Promise.resolve(new ArrayBuffer(0));
    });
    mockSha256.mockImplementation(
      async (_data: Uint8Array): Promise<ArrayBuffer> => new Uint8Array(32).fill(0xab).buffer as ArrayBuffer,
    );
    mockBase64urlEncode.mockImplementation((data: Uint8Array) => Buffer.from(data).toString("base64url"));
  });

  it("calls exportKey with 'raw' format on the public key", async () => {
    await _deriveNonce(mockKeyPair, "test-salt");

    expect(mockSubtle.exportKey).toHaveBeenCalledWith("raw", mockPublicCryptoKey);
  });

  it("calls sha256 with the concatenation of raw public key bytes and salt bytes", async () => {
    await _deriveNonce(mockKeyPair, "test-salt");

    const calledWith = (mockSha256.mock.calls[0] as [Uint8Array])[0];
    const expectedLength = MOCK_RAW_PUB.length + new TextEncoder().encode("test-salt").length;
    expect(calledWith.length).toBe(expectedLength);
    // First 65 bytes are the raw public key.
    expect(Array.from(calledWith.slice(0, MOCK_RAW_PUB.length))).toEqual(Array.from(MOCK_RAW_PUB));
    // Remaining bytes are the UTF-8 salt.
    expect(Array.from(calledWith.slice(MOCK_RAW_PUB.length))).toEqual(
      Array.from(new TextEncoder().encode("test-salt")),
    );
  });

  it("returns base64url of the sha256 output", async () => {
    const result = await _deriveNonce(mockKeyPair, "test-salt");

    expect(result).toBe(Buffer.from(new Uint8Array(32).fill(0xab)).toString("base64url"));
  });

  it("produces different nonces for different salts (mock passthrough)", async () => {
    mockSha256
      .mockImplementationOnce(async () => new Uint8Array(32).fill(0x01).buffer as ArrayBuffer)
      .mockImplementationOnce(async () => new Uint8Array(32).fill(0x02).buffer as ArrayBuffer);
    mockBase64urlEncode.mockImplementation((data: Uint8Array) => Buffer.from(data).toString("base64url"));

    const a = await _deriveNonce(mockKeyPair, "salt-a");
    const b = await _deriveNonce(mockKeyPair, "salt-b");

    expect(a).not.toBe(b);
  });
});

describe("createSalt", () => {
  // NOTE: createSalt is currently stubbed to return '' pending IDPLAT-840.
  it("returns an empty string (salt generation pending IDPLAT-840)", () => {
    expect(createSalt()).toBe("");
  });
});
