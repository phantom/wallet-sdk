import type {
  AuthProvider,
  AuthResult,
  EmbeddedStorage,
  PhantomConnectOptions,
  URLParamsAccessor,
  EmbeddedProviderAuthType,
} from "@phantom/embedded-provider-core";
import type { StamperWithKeyManagement } from "@phantom/sdk-types";
import {
  createCodeVerifier,
  createConnectStartUrl,
  exchangeAuthCode,
  Auth2KmsRpcClient,
  type Auth2AuthProviderOptions,
  type Auth2KmsClientOptions,
} from "@phantom/auth2";

/** Stampers used with Auth2 must be able to expose their CryptoKeyPair for JAR signing. */
interface Auth2StamperLike extends StamperWithKeyManagement {
  getCryptoKeyPair(): CryptoKeyPair | null;
  setIdToken(idToken: string): Promise<void>;
}

export class Auth2AuthProvider implements AuthProvider {
  private readonly auth2ProviderOptions: Auth2AuthProviderOptions;
  private readonly kms: Auth2KmsRpcClient;

  /** Redirect the browser. Extracted as a static method so tests can spy on it. */
  static navigate(url: string): void {
    window.location.href = url;
  }

  constructor(
    private readonly stamper: Auth2StamperLike,
    private readonly storage: EmbeddedStorage,
    private readonly urlParamsAccessor: URLParamsAccessor,
    auth2ProviderOptions: Auth2AuthProviderOptions,
    kmsClientOptions: Auth2KmsClientOptions,
  ) {
    this.auth2ProviderOptions = auth2ProviderOptions;
    this.kms = new Auth2KmsRpcClient(stamper, kmsClientOptions);
  }

  /**
   * Builds the Auth2 /login/start URL and redirects the browser.
   *
   * Called by EmbeddedProvider.handleRedirectAuth() after the stamper has
   * already been initialized and a pending Session has been saved to storage.
   * We store the PKCE code_verifier into that session so it survives the page
   * redirect without ever touching sessionStorage.
   */
  async authenticate(options: PhantomConnectOptions): Promise<void> {
    // Ensure the stamper has an active key loaded (may already be initialized).
    if (!this.stamper.getKeyInfo()) {
      await this.stamper.init();
    }

    const keyPair = this.stamper.getCryptoKeyPair();
    if (!keyPair) {
      throw new Error("Stamper key pair not found.");
    }

    const codeVerifier = createCodeVerifier();

    // Persist the code_verifier into the already-saved pending session.
    const session = await this.storage.getSession();
    if (!session) {
      throw new Error("Session not found.");
    }

    await this.storage.saveSession({ ...session, pkceCodeVerifier: codeVerifier });

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

    Auth2AuthProvider.navigate(url);
  }

  /**
   * Processes the Auth2 callback after the browser returns from /login/start.
   *
   * Exchanges the authorization code for tokens, discovers the organization
   * and wallet via KMS RPC, then returns a completed AuthResult.
   */
  async resumeAuthFromRedirect(provider: EmbeddedProviderAuthType): Promise<AuthResult | null> {
    const code = this.urlParamsAccessor.getParam("code");
    if (!code) {
      return null;
    }

    // Re-initialize the stamper from IndexedDB — the key was generated before
    // the redirect and is still there; this just reloads it into memory.
    if (!this.stamper.getKeyInfo()) {
      await this.stamper.init();
    }

    const session = await this.storage.getSession();
    if (!session) {
      throw new Error("Session not found.");
    }

    const codeVerifier = session?.pkceCodeVerifier;
    if (!codeVerifier) {
      return null;
    }

    const state = this.urlParamsAccessor.getParam("state");
    if (!state || state !== session.sessionId) {
      throw new Error("Missing or invalid Auth2 state parameter — possible CSRF attack.");
    }

    // Check for auth server errors in the callback URL.
    const error = this.urlParamsAccessor.getParam("error");
    if (error) {
      const description = this.urlParamsAccessor.getParam("error_description");
      throw new Error(`Auth2 callback error: ${description ?? error}`);
    }

    const { idToken, bearerToken, authUserId, expiresInMs } = await exchangeAuthCode({
      authApiBaseUrl: this.auth2ProviderOptions.authApiBaseUrl,
      clientId: this.auth2ProviderOptions.clientId,
      redirectUri: this.auth2ProviderOptions.redirectUri,
      code,
      codeVerifier,
    });

    // Arm the stamper with the id token for KMS requests.
    // Persisted to IndexedDB so auto-connect can restore it on the next page load.
    await this.stamper.setIdToken(idToken);

    // Persist the bearer token into the session — EmbeddedProvider will read it
    // in initializeClientFromSession() and inject it as the Authorization header.
    await this.storage.saveSession({
      ...session,
      status: "completed",
      bearerToken,
      authUserId,
      pkceCodeVerifier: undefined, // no longer needed after code exchange
    });

    const { organizationId, walletId } = await this.kms.discoverOrganizationAndWalletId(bearerToken, authUserId);

    return {
      walletId,
      organizationId,
      provider,
      accountDerivationIndex: 0, // discoverWalletId uses derivation index of 0.
      expiresInMs,
      authUserId,
      bearerToken,
    };
  }
}
