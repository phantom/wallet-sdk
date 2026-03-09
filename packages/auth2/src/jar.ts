import { base64urlDecode, base64urlEncode } from "@phantom/base64url";

const AUTH2_JAR_ALGORITHM = "ES256" as const;
const AUTH2_JAR_TYP = "oauth-authz-req+jwt" as const;

export type Auth2RequestJarPayload = {
  aud: string;
  exp: number;
  iat: number;
  client_id: string;
  nonce: string;
  redirect_uri: string;
  scope: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
  login_hint?: string;
};

type Auth2RequestJarHeader = {
  alg: typeof AUTH2_JAR_ALGORITHM;
  typ: typeof AUTH2_JAR_TYP;
  jwk: JsonWebKey;
};

const textEncoder = new TextEncoder();

export async function createAuth2RequestJar(input: {
  payload: Auth2RequestJarPayload;
  keyPair: CryptoKeyPair;
}): Promise<string> {
  const publicJwk = await globalThis.crypto.subtle.exportKey("jwk", input.keyPair.publicKey);

  if (!_isValidPublicJwk(publicJwk)) {
    throw new Error("Unable to export a valid P-256 public JWK for JAR header.");
  }

  const header: Auth2RequestJarHeader = {
    alg: AUTH2_JAR_ALGORITHM,
    typ: AUTH2_JAR_TYP,
    jwk: {
      kty: "EC",
      crv: "P-256",
      x: publicJwk.x,
      y: publicJwk.y,
    },
  };

  const encodedHeader = base64urlEncode(textEncoder.encode(JSON.stringify(header)));
  const encodedPayload = base64urlEncode(textEncoder.encode(JSON.stringify(input.payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await globalThis.crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    input.keyPair.privateKey,
    textEncoder.encode(signingInput),
  );

  return `${signingInput}.${base64urlEncode(new Uint8Array(signature))}`;
}

export function _isValidPublicJwk(
  jwk: JsonWebKey,
): jwk is JsonWebKey & { kty: "EC"; crv: "P-256"; x: string; y: string } {
  return jwk.kty === "EC" && jwk.crv === "P-256" && typeof jwk.x === "string" && typeof jwk.y === "string";
}

export function _buildUncompressedPublicKeyBytes(jwk: JsonWebKey): Uint8Array {
  const xCoord = jwk.x;
  const yCoord = jwk.y;

  if (typeof xCoord !== "string" || typeof yCoord !== "string") {
    throw new Error("JAR header is missing a valid P-256 public JWK.");
  }

  const x = base64urlDecode(xCoord);
  const y = base64urlDecode(yCoord);

  if (x.length !== 32 || y.length !== 32) {
    throw new Error("JAR header JWK coordinates must be 32-byte base64url values.");
  }

  const raw = new Uint8Array(65);

  raw[0] = 0x04;
  raw.set(x, 1);
  raw.set(y, 33);

  return raw;
}
