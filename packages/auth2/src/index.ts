import { base64urlEncode } from "@phantom/base64url";
import { sha256 } from "@phantom/crypto";
import { createAuth2RequestJar, type Auth2RequestJarPayload } from "./jar";

export { Auth2KmsRpcClient, type Auth2KmsClientOptions } from "./Auth2KmsRpcClient";

const DEFAULT_SCOPE = "openid";

export type Auth2AuthProviderOptions = {
  /** OAuth2 client ID */
  clientId: string;
  /** Where the OAuth server redirects back after authentication. */
  redirectUri: string;
  /** The URL of the login page */
  connectLoginUrl: string;
  /** Base URL of the Auth2 server used for token exchange. */
  authApiBaseUrl: string;
};

export function createCodeVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64urlEncode(bytes).slice(0, 96);
}

export function createSalt(): string {
  // TODO: Re-enable salt generation after IDPLAT-840 is resolved
  return "";
  // const bytes = new Uint8Array(32);
  // crypto.getRandomValues(bytes);
  // return base64urlEncode(bytes);
}

export async function createConnectStartUrl({
  keyPair,
  connectLoginUrl,
  clientId,
  redirectUri,
  sessionId,
  provider,
  codeVerifier,
  salt,
}: {
  keyPair: CryptoKeyPair;
  connectLoginUrl: string;
  clientId: string;
  redirectUri: string;
  sessionId: string;
  provider: string;
  codeVerifier: string;
  salt: string;
}): Promise<string> {
  const nonce = await _deriveNonce(keyPair, salt);
  const codeChallenge = await _createCodeChallenge(codeVerifier);

  const nowSeconds = Math.floor(Date.now() / 1_000);
  const jarPayload: Auth2RequestJarPayload = {
    aud: connectLoginUrl,
    iat: nowSeconds,
    exp: nowSeconds + 5 * 60, // 5 minutes
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: DEFAULT_SCOPE,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    ...(provider &&
      provider !== "phantom" &&
      provider !== "device" && {
        login_hint: `${provider}:auth2`,
      }),
    // Use session_id as the OAuth state so it comes back in the callback URL
    // and can be validated without an extra sessionStorage entry.
    state: sessionId,
  };

  const jar = await createAuth2RequestJar({
    payload: jarPayload,
    keyPair,
  });

  const url = new URL(connectLoginUrl);
  url.hash = `jar=${jar}`;

  return url.toString();
}

export async function _createCodeChallenge(codeVerifier: string): Promise<string> {
  return base64urlEncode(await sha256(new TextEncoder().encode(codeVerifier)));
}

/**
 * Derives the OIDC nonce from a public key and per-session salt.
 * Nonce = base64url(SHA-256(rawPublicKeyBytes || utf8(salt)))
 * "raw" exports the uncompressed EC point (0x04 || x || y, 65 bytes).
 */
export async function _deriveNonce(keyPair: CryptoKeyPair, salt: string): Promise<string> {
  const publicKey = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const rawPublicKey = new Uint8Array(publicKey);
  const saltBytes = new TextEncoder().encode(salt);
  const combined = new Uint8Array(rawPublicKey.length + saltBytes.length);
  combined.set(rawPublicKey);
  combined.set(saltBytes, rawPublicKey.length);
  return base64urlEncode(await sha256(combined));
}

type TokenExchangeResult = {
  idToken: string;
  /** KMS authorization header value: "Bearer <id_token>" */
  bearerToken: string;
  authUserId: string | undefined;
  expiresInMs: number;
};

/**
 * Exchanges an authorization code for tokens via the Auth2 server.
 * Returns the structured result including the bearer token derived from the id_token.
 */
export async function exchangeAuthCode(options: {
  authApiBaseUrl: string;
  clientId: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}): Promise<TokenExchangeResult> {
  const tokenEndpoint = new URL("/oauth2/token", options.authApiBaseUrl).toString();
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    code: options.code,
    code_verifier: options.codeVerifier,
  });

  const tokenResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new Error(`Auth2 token exchange failed (${tokenResponse.status} ${tokenResponse.statusText}): ${text}`);
  }

  const tokens = (await tokenResponse.json()) as {
    id_token?: string;
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  };

  const idToken = tokens.id_token;
  if (!idToken) {
    throw new Error("Auth2 token exchange did not return an id_token.");
  }

  // KMS authorization uses the ID token so the server can verify the nonce
  // binding (nonce = base64url(SHA-256(rawPublicKeyBytes || utf8(salt))) in id_token claims).
  const bearerToken = `${tokens?.token_type ?? "Bearer"} ${idToken}`;
  const authUserId = _parseJwtClaim(idToken, ["auth_user_id", "authUserId", "sub", "user_id"]) ?? undefined;
  const expiresInMs = tokens.expires_in != null ? tokens.expires_in * 1000 : 0;

  return { idToken, bearerToken, authUserId, expiresInMs };
}

/** Extracts the first matching string claim from a JWT payload. */
export function _parseJwtClaim(token: string, keys: string[]): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) {
      return null;
    }

    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;

    for (const key of keys) {
      const val = payload[key];
      if (typeof val === "string" && val.length > 0) {
        return val;
      }
    }

    return null;
  } catch {
    return null;
  }
}
