import * as WebBrowser from "expo-web-browser";
import type { AuthProvider, AuthResult, PhantomConnectOptions } from "@phantom/embedded-provider-core";
import type { StamperWithKeyManagement } from "@phantom/sdk-types";
import {
  createCodeVerifier,
  exchangeAuthCode,
  Auth2KmsRpcClient,
  type Auth2AuthProviderOptions,
  type Auth2KmsClientOptions,
  createConnectStartUrl,
} from "@phantom/auth2";

/** Stampers used with Auth2 must be able to expose their CryptoKeyPair for JAR signing. */
interface Auth2StamperLike extends StamperWithKeyManagement {
  getCryptoKeyPair(): CryptoKeyPair | null;
  setIdToken(idToken: string): Promise<void>;
}

export class ExpoAuth2AuthProvider implements AuthProvider {
  private readonly auth2ProviderOptions: Auth2AuthProviderOptions;
  private readonly kms: Auth2KmsRpcClient;

  constructor(
    private readonly stamper: Auth2StamperLike,
    auth2ProviderOptions: Auth2AuthProviderOptions,
    kmsClientOptions: Auth2KmsClientOptions,
  ) {
    this.auth2ProviderOptions = auth2ProviderOptions;
    this.kms = new Auth2KmsRpcClient(stamper, kmsClientOptions);
  }

  /**
   * Runs the full PKCE Auth2 flow inline using expo-web-browser.
   *
   * Unlike the browser flow (which requires a page redirect and resumeAuthFromRedirect),
   * expo-web-browser intercepts the OAuth callback URL and returns it synchronously,
   * so the token exchange and KMS calls all happen here before returning AuthResult.
   */
  async authenticate(options: PhantomConnectOptions): Promise<void | AuthResult> {
    // Ensure the stamper has an active key loaded (may already be initialized).
    if (!this.stamper.getKeyInfo()) {
      await this.stamper.init();
    }

    const keyPair = this.stamper.getCryptoKeyPair();
    if (!keyPair) {
      throw new Error("Stamper key pair not found.");
    }

    const codeVerifier = createCodeVerifier();

    const url = await createConnectStartUrl({
      keyPair,
      connectLoginUrl: this.auth2ProviderOptions.connectLoginUrl,
      clientId: this.auth2ProviderOptions.clientId,
      redirectUri: this.auth2ProviderOptions.redirectUri,
      sessionId: options.sessionId,
      provider: options.provider,
      codeVerifier,
      // The P-256 ephemeral key is unique per wallet, so no additional salt is needed.
      salt: "",
    });

    // Open the OAuth flow in an embedded browser; expo-web-browser intercepts
    // the redirect back to this app's custom scheme and returns the callback URL.
    await WebBrowser.warmUpAsync();

    let result: Awaited<ReturnType<typeof WebBrowser.openAuthSessionAsync>>;
    try {
      result = await WebBrowser.openAuthSessionAsync(url, this.auth2ProviderOptions.redirectUri);
    } finally {
      await WebBrowser.coolDownAsync();
    }

    if (!result.url) {
      throw new Error("Authentication failed");
    }

    const callbackUrl = new URL(result.url);

    const state = callbackUrl.searchParams.get("state");
    if (state && state !== options.sessionId) {
      throw new Error("Auth2 state mismatch — possible CSRF attack.");
    }

    // Check for auth server errors in the callback URL.
    const error = callbackUrl.searchParams.get("error");
    if (error) {
      const description = callbackUrl.searchParams.get("error_description");
      throw new Error(`Auth2 callback error: ${description ?? error}`);
    }

    const code = callbackUrl.searchParams.get("code");
    if (!code) {
      throw new Error("Auth2 callback missing authorization code");
    }

    const { idToken, bearerToken, authUserId, expiresInMs } = await exchangeAuthCode({
      authApiBaseUrl: this.auth2ProviderOptions.authApiBaseUrl,
      clientId: this.auth2ProviderOptions.clientId,
      redirectUri: this.auth2ProviderOptions.redirectUri,
      code,
      codeVerifier,
    });

    // Arm the stamper with the id token for KMS requests.
    // Persisted to SecureStore so auto-connect can restore it on the next app launch.
    await this.stamper.setIdToken(idToken);

    const { organizationId, walletId } = await this.kms.discoverOrganizationAndWalletId(bearerToken, authUserId);

    return {
      walletId,
      organizationId,
      provider: options.provider,
      accountDerivationIndex: 0, // discoverWalletId uses derivation index of 0.
      expiresInMs,
      authUserId,
      bearerToken,
    };
  }
}
