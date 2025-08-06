import { Linking } from 'react-native';
import type { AuthProvider, AuthResult, PhantomConnectOptions, JWTAuthOptions } from '@phantom/embedded-provider-core';

interface InAppBrowser {
  open: (url: string, target?: string, options?: any) => Promise<any>;
  close: () => void;
  isAvailable: () => Promise<boolean>;
}

export class ReactNativeAuthProvider implements AuthProvider {
  private inAppBrowser: InAppBrowser | null = null;

  constructor() {
    this.initializeInAppBrowser();
  }

  private initializeInAppBrowser(): void {
    try {
      // Try to load react-native-inappbrowser-reborn
      const InAppBrowserModule = require('react-native-inappbrowser-reborn');
      if (InAppBrowserModule && InAppBrowserModule.default) {
        this.inAppBrowser = InAppBrowserModule.default;
      }
    } catch (error) {
      console.warn('[ReactNativeAuthProvider] react-native-inappbrowser-reborn not available, falling back to system browser');
    }
  }

  async authenticate(options: PhantomConnectOptions | JWTAuthOptions): Promise<void | AuthResult> {
    // Handle JWT authentication
    if ('jwtToken' in options) {
      // JWT authentication doesn't require web browser flow
      return;
    }

    // Handle redirect-based authentication
    const { authUrl, redirectUrl } = options;
    
    if (!authUrl || !redirectUrl) {
      throw new Error('authUrl and redirectUrl are required for web browser authentication');
    }

    try {
      console.log('[ReactNativeAuthProvider] Starting authentication', {
        authUrl: authUrl.substring(0, 50) + '...',
        redirectUrl,
        hasInAppBrowser: !!this.inAppBrowser,
      });

      if (this.inAppBrowser && await this.inAppBrowser.isAvailable()) {
        return await this.authenticateWithInAppBrowser(authUrl, redirectUrl);
      } else {
        return await this.authenticateWithSystemBrowser(authUrl, redirectUrl);
      }
    } catch (error) {
      console.error('[ReactNativeAuthProvider] Authentication error', error);
      throw error;
    }
  }

  private async authenticateWithInAppBrowser(authUrl: string, _redirectUrl: string): Promise<AuthResult> {
    if (!this.inAppBrowser) {
      throw new Error('InAppBrowser not available');
    }

    const result = await this.inAppBrowser.open(authUrl, '_blank', {
      showTitle: false,
      toolbarColor: '#000000',
      secondaryToolbarColor: '#000000',
      navigationBarColor: '#000000',
      navigationBarDividerColor: '#ffffff',
      enableUrlBarHiding: true,
      enableDefaultShare: false,
      forceCloseOnRedirection: true,
      modalPresentationStyle: 'fullScreen',
    });

    if (result.type === 'success' && result.url) {
      return this.parseAuthResult(result.url);
    } else if (result.type === 'cancel') {
      throw new Error('User cancelled authentication');
    } else {
      throw new Error('Authentication failed');
    }
  }

  private async authenticateWithSystemBrowser(authUrl: string, redirectUrl: string): Promise<AuthResult> {
    return new Promise((resolve, reject) => {
      let linkingListener: any = null;
      let timeout: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (linkingListener) {
          linkingListener.remove();
        }
        if (timeout) {
          clearTimeout(timeout);
        }
      };

      // Set up deep link listener
      linkingListener = Linking.addEventListener('url', ({ url }) => {
        if (url.startsWith(redirectUrl)) {
          cleanup();
          try {
            const result = this.parseAuthResult(url);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }
      });

      // Set up timeout (5 minutes)
      timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Authentication timed out'));
      }, 300000);

      // Open the auth URL in system browser
      Linking.openURL(authUrl).catch((error) => {
        cleanup();
        reject(new Error(`Failed to open browser: ${error.message}`));
      });
    });
  }

  private parseAuthResult(url: string): AuthResult {
    try {
      const parsedUrl = new URL(url);
      const walletId = parsedUrl.searchParams.get('walletId');
      const provider = parsedUrl.searchParams.get('provider');
      
      if (!walletId) {
        throw new Error('Authentication failed: no walletId in redirect URL');
      }

      // Convert URLSearchParams to Record<string, string>
      const userInfo: Record<string, string> = {};
      parsedUrl.searchParams.forEach((value, key) => {
        userInfo[key] = value;
      });

      return {
        walletId,
        provider: provider || undefined,
        userInfo,
      };
    } catch (error) {
      throw new Error(`Failed to parse authentication result: ${(error as Error).message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    // Check if we have either InAppBrowser or system linking
    if (this.inAppBrowser) {
      return await this.inAppBrowser.isAvailable();
    }
    
    // System browser via Linking is always available
    return true;
  }
}