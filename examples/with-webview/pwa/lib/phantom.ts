import { BrowserSDK, AddressType } from '@phantom/browser-sdk';
import type { BrowserSDKConfig, ConnectResult, WalletAddress } from '@phantom/browser-sdk';
import { WebViewBridge } from './webview-bridge';

export interface DualModePhantomConfig extends Omit<BrowserSDKConfig, 'providerType'> {
  // Config that works for both browser and WebView modes
  appId: string;
  addressTypes: AddressType[];
  authOptions?: {
    authUrl?: string;
    redirectUrl?: string;
  };
}

/**
 * Dual-mode Phantom SDK that works in both browser and React Native WebView environments
 *
 * - Browser: Uses standard browser-sdk with OAuth
 * - WebView: Uses postMessage bridge to React Native
 */
export class DualModePhantom {
  private browserSDK: BrowserSDK | null = null;
  private webViewBridge: WebViewBridge | null = null;
  private isConnected = false;
  private addresses: WalletAddress[] = [];
  private walletId: string | null = null;

  constructor(private config: DualModePhantomConfig) {
    if (this.isInWebView()) {
      console.log('[DualModePhantom] WebView environment detected, using bridge mode');
      this.webViewBridge = new WebViewBridge();
    } else {
      console.log('[DualModePhantom] Browser environment detected, using browser-sdk');
      this.browserSDK = new BrowserSDK({
        ...config,
        providerType: 'embedded', // Use embedded for OAuth
      });
    }
  }

  /**
   * Check if we're running in a React Native WebView
   */
  private isInWebView(): boolean {
    return typeof window !== 'undefined' && !!window.ReactNativeWebView;
  }

  /**
   * Connect to Phantom wallet
   */
  async connect(options: { provider?: 'google' | 'apple' } = {}): Promise<ConnectResult> {
    if (this.isInWebView()) {
      return this.connectViaWebView(options.provider || 'google');
    } else {
      return this.connectViaBrowser(options);
    }
  }

  /**
   * Connect via React Native WebView bridge
   */
  private async connectViaWebView(provider: 'google' | 'apple'): Promise<ConnectResult> {
    if (!this.webViewBridge) {
      throw new Error('WebView bridge not initialized');
    }

    try {
      const result = await this.webViewBridge.requestAuth(provider);

      if (result.addresses && result.walletId) {
        this.isConnected = true;
        this.addresses = result.addresses;
        this.walletId = result.walletId;

        return {
          walletId: result.walletId,
          addresses: result.addresses,
          status: 'completed'
        };
      } else {
        throw new Error('Invalid auth response from React Native');
      }
    } catch (error) {
      console.error('[DualModePhantom] WebView auth failed:', error);
      throw error;
    }
  }

  /**
   * Connect via browser SDK
   */
  private async connectViaBrowser(options: { provider?: 'google' | 'apple' }): Promise<ConnectResult> {
    if (!this.browserSDK) {
      throw new Error('Browser SDK not initialized');
    }

    try {
      const result = await this.browserSDK.connect({
        provider: options.provider || 'google'
      });

      this.isConnected = true;
      this.addresses = result.addresses;
      this.walletId = result.walletId || null;

      return result;
    } catch (error) {
      console.error('[DualModePhantom] Browser auth failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from wallet
   */
  async disconnect(): Promise<void> {
    if (this.browserSDK) {
      await this.browserSDK.disconnect();
    }

    this.isConnected = false;
    this.addresses = [];
    this.walletId = null;

    // Note: In WebView mode, disconnection is handled by React Native
    // We just reset our local state
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    if (this.browserSDK) {
      return this.browserSDK.isConnected();
    }
    return this.isConnected;
  }

  /**
   * Get wallet addresses
   */
  getAddresses(): WalletAddress[] {
    if (this.browserSDK) {
      return this.browserSDK.getAddresses();
    }
    return this.addresses;
  }

  /**
   * Get wallet ID
   */
  getWalletId(): string | null {
    if (this.browserSDK) {
      return this.browserSDK.getWalletId();
    }
    return this.walletId;
  }

  /**
   * Get Solana chain operations
   * Works in both browser and WebView modes
   */
  get solana() {
    if (this.isInWebView()) {
      // Return WebView-compatible Solana interface
      return {
        signMessage: async (message: string) => {
          if (!this.webViewBridge) {
            throw new Error('WebView bridge not available');
          }
          return this.webViewBridge.requestSignMessage(message);
        },
        signAndSendTransaction: async (transaction: any) => {
          if (!this.webViewBridge) {
            throw new Error('WebView bridge not available');
          }
          return this.webViewBridge.requestSignAndSendTransaction(transaction);
        }
      };
    } else {
      // Return browser SDK Solana interface
      if (!this.browserSDK) {
        throw new Error('Browser SDK not initialized');
      }
      return this.browserSDK.solana;
    }
  }

  /**
   * Get Ethereum chain operations
   * Only works in browser mode - WebView mode would need additional bridge methods
   */
  get ethereum() {
    if (!this.browserSDK) {
      throw new Error('Ethereum operations not available in WebView mode. Use React Native SDK directly.');
    }
    return this.browserSDK.ethereum;
  }

  /**
   * Get environment info
   */
  getEnvironmentInfo() {
    return {
      isWebView: this.isInWebView(),
      mode: this.isInWebView() ? 'webview-bridge' : 'browser-sdk',
      hasReactNativeBridge: !!this.webViewBridge,
      hasBrowserSDK: !!this.browserSDK
    };
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.webViewBridge) {
      this.webViewBridge.dispose();
    }
  }
}

/**
 * Factory function to create a dual-mode Phantom instance
 */
export function createDualModePhantom(config: DualModePhantomConfig): DualModePhantom {
  return new DualModePhantom(config);
}