// 32-byte all-0x11 values used as mock x/y coordinates.
const MOCK_COORD = new Uint8Array(32).fill(0x11);
const mockBase64urlEncode = jest.fn((data: Uint8Array) => Buffer.from(data).toString("base64url"));
const mockBase64urlDecode = jest.fn((_data: string) => MOCK_COORD);
jest.mock("@phantom/base64url", () => ({
  base64urlEncode: mockBase64urlEncode,
  base64urlDecode: mockBase64urlDecode,
}));

const MOCK_SIGNATURE = new Uint8Array(64).fill(0x55);
const MOCK_DIGEST = new Uint8Array(32).fill(0xcc);
const NONCE = Buffer.from(MOCK_DIGEST).toString("base64url");

const MOCK_JWK = {
  kty: "EC",
  crv: "P-256",
  x: Buffer.from(MOCK_COORD).toString("base64url"),
  y: Buffer.from(MOCK_COORD).toString("base64url"),
};

const mockPrivateKey = { type: "private", algorithm: { name: "ECDSA" } } as CryptoKey;
const mockPublicKey = { type: "public", algorithm: { name: "ECDSA" } } as CryptoKey;

const mockSubtle = {
  exportKey: jest.fn(),
  sign: jest.fn(),
};

import {
  createAuth2RequestJar,
  _isValidPublicJwk,
  _buildUncompressedPublicKeyBytes,
  type Auth2RequestJarPayload,
} from "../jar";

describe("_isValidPublicJwk", () => {
  it("returns true for a complete EC P-256 JWK with string x and y", () => {
    expect(_isValidPublicJwk({ kty: "EC", crv: "P-256", x: "abc", y: "def" })).toBe(true);
  });

  it("returns false when kty is not EC", () => {
    expect(_isValidPublicJwk({ kty: "RSA", crv: "P-256", x: "abc", y: "def" })).toBe(false);
  });

  it("returns false when crv is not P-256", () => {
    expect(_isValidPublicJwk({ kty: "EC", crv: "P-384", x: "abc", y: "def" })).toBe(false);
  });

  it("returns false when x is absent", () => {
    expect(_isValidPublicJwk({ kty: "EC", crv: "P-256", y: "def" })).toBe(false);
  });

  it("returns false when y is absent", () => {
    expect(_isValidPublicJwk({ kty: "EC", crv: "P-256", x: "abc" })).toBe(false);
  });

  it("returns false when x is a number rather than a string", () => {
    expect(_isValidPublicJwk({ kty: "EC", crv: "P-256", x: 123 as unknown as string, y: "def" })).toBe(false);
  });
});

describe("_buildUncompressedPublicKeyBytes", () => {
  beforeEach(() => {
    mockBase64urlDecode.mockImplementation((_data: string) => MOCK_COORD);
  });

  it("throws when x is absent", () => {
    expect(() => _buildUncompressedPublicKeyBytes({ kty: "EC", crv: "P-256", y: "def" })).toThrow(
      "JAR header is missing a valid P-256 public JWK.",
    );
  });

  it("throws when y is absent", () => {
    expect(() => _buildUncompressedPublicKeyBytes({ kty: "EC", crv: "P-256", x: "abc" })).toThrow(
      "JAR header is missing a valid P-256 public JWK.",
    );
  });

  it("throws when the x coordinate decodes to fewer than 32 bytes", () => {
    mockBase64urlDecode.mockImplementation((_data: string) => new Uint8Array(16));

    expect(() => _buildUncompressedPublicKeyBytes({ kty: "EC", crv: "P-256", x: "short", y: "abc" })).toThrow(
      "JAR header JWK coordinates must be 32-byte base64url values.",
    );
  });

  it("throws when the y coordinate decodes to more than 32 bytes", () => {
    mockBase64urlDecode
      .mockImplementationOnce((_data: string) => new Uint8Array(32)) // x ok
      .mockImplementationOnce((_data: string) => new Uint8Array(33)); // y too long

    expect(() => _buildUncompressedPublicKeyBytes({ kty: "EC", crv: "P-256", x: "abc", y: "long" })).toThrow(
      "JAR header JWK coordinates must be 32-byte base64url values.",
    );
  });

  it("returns a 65-byte Uint8Array prefixed with 0x04", () => {
    const result = _buildUncompressedPublicKeyBytes({ kty: "EC", crv: "P-256", x: "x", y: "y" });

    expect(result).toHaveLength(65);
    expect(result[0]).toBe(0x04);
  });

  it("places x bytes at offset 1–32 and y bytes at offset 33–64", () => {
    const x = new Uint8Array(32).fill(0x11);
    const y = new Uint8Array(32).fill(0x22);
    mockBase64urlDecode.mockImplementationOnce(() => x).mockImplementationOnce(() => y);

    const result = _buildUncompressedPublicKeyBytes({ kty: "EC", crv: "P-256", x: "x", y: "y" });

    expect(Array.from(result.slice(1, 33))).toEqual(Array.from(x));
    expect(Array.from(result.slice(33, 65))).toEqual(Array.from(y));
  });

  it("decodes both the x and y coordinates from the JWK", () => {
    _buildUncompressedPublicKeyBytes({ kty: "EC", crv: "P-256", x: "xval", y: "yval" });

    expect(mockBase64urlDecode).toHaveBeenCalledWith("xval");
    expect(mockBase64urlDecode).toHaveBeenCalledWith("yval");
  });
});

describe("createAuth2RequestJar", () => {
  const basePayload: Auth2RequestJarPayload = {
    aud: "https://auth.example.com/login/start",
    iat: 1_700_000_000,
    exp: 1_700_000_300,
    client_id: "test-client",
    nonce: NONCE,
    redirect_uri: "https://app.example.com/callback",
    scope: "openid",
    state: "state-123",
    code_challenge: "challenge-abc",
    code_challenge_method: "S256",
  };

  const mockKeyPair: CryptoKeyPair = { privateKey: mockPrivateKey, publicKey: mockPublicKey };

  beforeEach(() => {
    Object.defineProperty(globalThis.crypto, "subtle", {
      value: mockSubtle,
      writable: true,
      configurable: true,
    });
    mockSubtle.exportKey.mockImplementation((format: string) => {
      if (format === "jwk") return Promise.resolve(MOCK_JWK);
      return Promise.resolve(new ArrayBuffer(0));
    });
    mockSubtle.sign.mockResolvedValue(MOCK_SIGNATURE.buffer.slice(0) as ArrayBuffer);
    mockBase64urlEncode.mockImplementation((data: Uint8Array) => Buffer.from(data).toString("base64url"));
    mockBase64urlDecode.mockImplementation((_data: string) => MOCK_COORD);
  });

  it("returns a three-part JWT string (header.payload.signature)", async () => {
    const jar = await createAuth2RequestJar({ payload: basePayload, keyPair: mockKeyPair });

    expect(jar.split(".")).toHaveLength(3);
  });

  it("header contains alg=ES256 and typ=oauth-authz-req+jwt", async () => {
    const jar = await createAuth2RequestJar({ payload: basePayload, keyPair: mockKeyPair });

    const header = JSON.parse(Buffer.from(jar.split(".")[0]!, "base64url").toString("utf8")) as Record<string, unknown>;
    expect(header.alg).toBe("ES256");
    expect(header.typ).toBe("oauth-authz-req+jwt");
  });

  it("header embeds only the kty, crv, x, y fields from the public JWK", async () => {
    const jar = await createAuth2RequestJar({ payload: basePayload, keyPair: mockKeyPair });

    const header = JSON.parse(Buffer.from(jar.split(".")[0]!, "base64url").toString("utf8")) as Record<string, unknown>;
    const jwk = header.jwk as Record<string, unknown>;
    expect(jwk.kty).toBe("EC");
    expect(jwk.crv).toBe("P-256");
    expect(typeof jwk.x).toBe("string");
    expect(typeof jwk.y).toBe("string");
    // Private fields must not leak into the header JWK.
    expect(jwk.d).toBeUndefined();
  });

  it("embeds the payload as the second JWT part", async () => {
    const jar = await createAuth2RequestJar({ payload: basePayload, keyPair: mockKeyPair });

    const decoded = JSON.parse(Buffer.from(jar.split(".")[1]!, "base64url").toString("utf8")) as Auth2RequestJarPayload;
    expect(decoded.client_id).toBe("test-client");
    expect(decoded.nonce).toBe(NONCE);
    expect(decoded.aud).toBe("https://auth.example.com/login/start");
  });

  it("exports the JWK of the public key to build the header", async () => {
    await createAuth2RequestJar({ payload: basePayload, keyPair: mockKeyPair });

    expect(mockSubtle.exportKey).toHaveBeenCalledWith("jwk", mockPublicKey);
  });

  it("signs the header.payload signing input with ECDSA/SHA-256 using the private key", async () => {
    await createAuth2RequestJar({ payload: basePayload, keyPair: mockKeyPair });

    expect(mockSubtle.sign).toHaveBeenCalledWith(
      { name: "ECDSA", hash: "SHA-256" },
      mockPrivateKey,
      expect.any(Uint8Array),
    );
  });

  it("includes an optional login_hint when present in the payload", async () => {
    const payloadWithHint = { ...basePayload, login_hint: "google:auth2" };

    const jar = await createAuth2RequestJar({ payload: payloadWithHint, keyPair: mockKeyPair });

    const decoded = JSON.parse(Buffer.from(jar.split(".")[1]!, "base64url").toString("utf8")) as Auth2RequestJarPayload;
    expect(decoded.login_hint).toBe("google:auth2");
  });

  it("omits login_hint from the payload when not provided", async () => {
    const jar = await createAuth2RequestJar({ payload: basePayload, keyPair: mockKeyPair });

    const decoded = JSON.parse(Buffer.from(jar.split(".")[1]!, "base64url").toString("utf8")) as Auth2RequestJarPayload;
    expect(decoded.login_hint).toBeUndefined();
  });

  it("throws 'Unable to export a valid P-256 public JWK' when the exported key is not EC/P-256", async () => {
    mockSubtle.exportKey.mockResolvedValueOnce({ kty: "RSA" });

    await expect(createAuth2RequestJar({ payload: basePayload, keyPair: mockKeyPair })).rejects.toThrow(
      "Unable to export a valid P-256 public JWK for JAR header.",
    );
  });
});
