import React from 'react';
import { SecureWebView, type WebViewState, type SecureWebViewConfig, type NavigationResult } from '@phantom/secure-webview';
import type { AuthProvider, AuthResult, PhantomConnectOptions, JWTAuthOptions } from "@phantom/embedded-provider-core";
import { DEFAULT_AUTH_URL } from "@phantom/constants";

declare const __SDK_VERSION__: string;

interface SecureWebViewAuthConfig {
  enableLogging?: boolean;
  allowedOrigins?: string[];
}

export class SecureWebViewAuth implements AuthProvider {
  private webViewRef: React.RefObject<SecureWebView> | null = null;
  private authPromise: {
    resolve: (value: void | AuthResult) => void;
    reject: (reason: any) => void;
  } | null = null;
  private config: SecureWebViewAuthConfig;
  private renderWebView: ((element: React.ReactElement) => void) | null = null;
  private hideWebViewCallback: (() => void) | null = null;

  constructor(config: SecureWebViewAuthConfig = {}) {
    this.config = config;
  }

  // Called by PhantomProvider to set up rendering callbacks
  public setRenderCallbacks(
    renderWebView: (element: React.ReactElement) => void,
    hideWebView: () => void
  ) {
    this.renderWebView = renderWebView;
    this.hideWebViewCallback = hideWebView;
  }

  async authenticate(options: PhantomConnectOptions | JWTAuthOptions): Promise<void | AuthResult> {
    // Handle JWT authentication
    if ("jwtToken" in options) {
      return;
    }

    // Handle redirect-based authentication
    const phantomOptions = options as PhantomConnectOptions;
    const { authUrl, redirectUrl, organizationId, sessionId, provider, customAuthData, appId } =
      phantomOptions;

    if (!redirectUrl) {
      throw new Error("redirectUrl is required for web browser authentication");
    }

    if (!organizationId || !sessionId || !appId) {
      throw new Error("organizationId, sessionId and appId are required for authentication");
    }

    if (!this.renderWebView) {
      throw new Error("SecureWebViewAuth not properly initialized - renderWebView callback missing");
    }

    return new Promise((resolve, reject) => {
      this.authPromise = { resolve, reject };

      try {
        // Construct the authentication URL
        const baseUrl = authUrl || DEFAULT_AUTH_URL;
        const params = new URLSearchParams({
          organization_id: organizationId,
          app_id: appId,
          redirect_uri: redirectUrl,
          session_id: sessionId,
          clear_previous_session: "true",
          sdk_version: __SDK_VERSION__,
        });

        if (provider) {
          params.append("provider", provider);
        } else {
          params.append("provider", "google");
        }

        if (customAuthData) {
          params.append("authData", JSON.stringify(customAuthData));
        }

        const fullAuthUrl = `${baseUrl}?${params.toString()}`;

        // Create SecureWebView configuration
        const webViewConfig: SecureWebViewConfig = {
          navigation: {
            redirectUrl,
            timeout: 300000 // 5 minutes
          },
          session: {
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            autoHideAfterAuth: true
          },
          security: {
            allowedOrigins: this.config.allowedOrigins || [
              'https://connect.phantom.com',
              'https://staging-connect.phantom.com'
            ],
            enableEncryption: false,
            strictCSP: true,
            blockDangerousAPIs: true,
            enableLogging: this.config.enableLogging || false,
            maxMessageSize: 1024 * 1024, // 1MB
            messageRateLimit: 100 // messages per minute
          }
        };

        const callbacks = {
          onNavigationComplete: this.handleNavigationComplete,
          onError: this.handleError,
          onStateChange: this.config.enableLogging ? this.handleStateChange : undefined
        };

        // Create the WebView element
        console.log('[SecureWebViewAuth] Creating webview element...');
        try {
          const webViewElement = React.createElement(SecureWebView as any, {
            ref: (ref: SecureWebView) => {
              console.log('[SecureWebViewAuth] WebView ref set:', !!ref);
              this.webViewRef = { current: ref };
            },
            config: webViewConfig,
            callbacks,
            testID: 'phantom-auth-webview'
          });

          console.log('[SecureWebViewAuth] WebView element created, rendering...');
          // Render the WebView
          this.renderWebView!(webViewElement);
          console.log('[SecureWebViewAuth] WebView rendered successfully');
        } catch (createError) {
          console.error('[SecureWebViewAuth] Error creating/rendering WebView:', createError);
          throw createError;
        }

        // Start navigation
        setTimeout(() => {
          if (this.webViewRef?.current) {
            this.webViewRef.current.navigateToUrl(fullAuthUrl);
          }
        }, 100); // Small delay to ensure WebView is mounted

      } catch (error) {
        reject(error);
        this.authPromise = null;
      }
    });
  }

  async isAvailable(): Promise<boolean> {
    return Promise.resolve(true);
  }

  private handleNavigationComplete = (result: NavigationResult) => {
    console.log('Navigation complete:', result);
    if (!this.authPromise) {
      return;
    }


    const { resolve, reject } = this.authPromise;
    this.authPromise = null;

    try {
      if (result.success && result.url) {
        // Parse the URL to extract parameters
        const url = new URL(result.url);
        const walletId = url.searchParams.get("wallet_id");
        const provider = url.searchParams.get("provider");
        const accountDerivationIndex = url.searchParams.get("selected_account_index");

        if (!walletId) {
          reject(new Error("Authentication failed: no walletId in redirect URL"));
          return;
        }

        resolve({
          walletId,
          provider: provider || undefined,
          accountDerivationIndex: accountDerivationIndex ? parseInt(accountDerivationIndex) : 0,
        });

        // Hide the WebView after successful authentication
        if (this.hideWebViewCallback) {
          this.hideWebViewCallback();
        }
      } else {
        reject(new Error(result.error || "Authentication failed"));
        if (this.hideWebViewCallback) {
          this.hideWebViewCallback();
        }
      }
    } catch (error) {
      reject(error);
      if (this.hideWebViewCallback) {
        this.hideWebViewCallback();
      }
    }
  };

  private handleError = (error: Error) => {
    console.error('SecureWebView encountered an error:', error);
    if (this.authPromise) {
      this.authPromise.reject(error);
      this.authPromise = null;
    }

    if (this.hideWebViewCallback) {
      this.hideWebViewCallback();
    }
  };

  private handleStateChange = (oldState: WebViewState, newState: WebViewState) => {
    if (this.config.enableLogging) {
      console.log(`[SecureWebViewAuth] State changed from ${oldState} to ${newState}`);
    }
  };

  // Public methods for controlling the WebView
  public hideWebView = () => {
    if (this.webViewRef?.current) {
      this.webViewRef.current.hideWebView();
    } else if (this.hideWebViewCallback) {
      this.hideWebViewCallback();
    }
  };

  public showWebView = () => {
    if (this.webViewRef?.current) {
      this.webViewRef.current.showWebView();
    }
  };

  public closeWebView = () => {
    if (this.webViewRef?.current) {
      this.webViewRef.current.close();
    }

    if (this.hideWebViewCallback) {
      this.hideWebViewCallback();
    }

    // Clean up any pending promises
    if (this.authPromise) {
      this.authPromise.reject(new Error('WebView closed'));
      this.authPromise = null;
    }
  };
}