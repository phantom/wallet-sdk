import type {
  BrowserSDKConfig,
  ConnectResult,
  WalletAddress,
  AuthOptions,
} from "./types";
import { ProviderManager, type SwitchProviderOptions, type ProviderPreference } from "./ProviderManager";
import { isPhantomExtensionInstalled } from "@phantom/browser-injected-sdk";
import { debug, DebugCategory, type DebugLevel, type DebugCallback } from "./debug";
import type { ISolanaChain, IEthereumChain } from "@phantom/chains";
import type { EmbeddedProviderEvent, EventCallback } from "@phantom/embedded-provider-core";

/**
 * Browser SDK with chain-specific API
 * 
 * Usage:
 * ```typescript
 * const sdk = new BrowserSDK({ providerType: 'embedded', appId: 'your-app-id' });
 * await sdk.connect();
 * 
 * // Chain-specific operations
 * await sdk.solana.signMessage(message);
 * await sdk.ethereum.signPersonalMessage(message, address);
 * ```
 */
export class BrowserSDK {
  private providerManager: ProviderManager;

  constructor(config: BrowserSDKConfig) {
    debug.info(DebugCategory.BROWSER_SDK, "Initializing BrowserSDK", {
      providerType: config.providerType,
      embeddedWalletType: config.embeddedWalletType,
      addressTypes: config.addressTypes,
    });

    // Validate providerType
    if (!["injected", "embedded"].includes(config.providerType)) {
      debug.error(DebugCategory.BROWSER_SDK, "Invalid providerType", { providerType: config.providerType });
      throw new Error(`Invalid providerType: ${config.providerType}. Must be "injected" or "embedded".`);
    }

    const embeddedWalletType = config.embeddedWalletType || "app-wallet";

    // Validate embeddedWalletType if provided
    if (config.providerType === "embedded" && !["app-wallet", "user-wallet"].includes(embeddedWalletType)) {
      debug.error(DebugCategory.BROWSER_SDK, "Invalid embeddedWalletType", {
        embeddedWalletType: config.embeddedWalletType,
      });
      throw new Error(
        `Invalid embeddedWalletType: ${config.embeddedWalletType}. Must be "app-wallet" or "user-wallet".`,
      );
    }

    this.providerManager = new ProviderManager(config);
  }

  // ===== CHAIN API =====
  
  /**
   * Access Solana chain operations
   */
  get solana(): ISolanaChain {
    const currentProvider = this.providerManager.getCurrentProvider();
    if (!currentProvider) {
      throw new Error('No provider available. Call connect() first.');
    }
    return currentProvider.solana;
  }
  
  /**
   * Access Ethereum chain operations
   */
  get ethereum(): IEthereumChain {
    const currentProvider = this.providerManager.getCurrentProvider();
    if (!currentProvider) {
      throw new Error('No provider available. Call connect() first.');
    }
    return currentProvider.ethereum;
  }

  // ===== CONNECTION MANAGEMENT =====

  /**
   * Connect to the wallet
   */
  async connect(options?: AuthOptions): Promise<ConnectResult> {
    debug.info(DebugCategory.BROWSER_SDK, "Starting connection", options);

    try {
      const result = await this.providerManager.connect(options);
      
      debug.info(DebugCategory.BROWSER_SDK, "Connection successful", {
        addressCount: result.addresses.length,
        walletId: result.walletId,
        status: result.status,
      });

      return result;
    } catch (error) {
      debug.error(DebugCategory.BROWSER_SDK, "Connection failed", { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    debug.info(DebugCategory.BROWSER_SDK, "Disconnecting");

    try {
      await this.providerManager.disconnect();
      debug.info(DebugCategory.BROWSER_SDK, "Disconnection successful");
    } catch (error) {
      debug.error(DebugCategory.BROWSER_SDK, "Disconnection failed", { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Switch between provider types (injected vs embedded)
   */
  async switchProvider(type: "injected" | "embedded", options?: SwitchProviderOptions): Promise<void> {
    debug.info(DebugCategory.BROWSER_SDK, "Switching provider", { type, options });

    try {
      await this.providerManager.switchProvider(type, options);
      debug.info(DebugCategory.BROWSER_SDK, "Provider switch successful", { type });
    } catch (error) {
      debug.error(DebugCategory.BROWSER_SDK, "Provider switch failed", { 
        type, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  // ===== STATE QUERIES =====

  /**
   * Check if the SDK is connected to a wallet
   */
  isConnected(): boolean {
    return this.providerManager.isConnected();
  }

  /**
   * Get all connected wallet addresses
   */
  getAddresses(): WalletAddress[] {
    return this.providerManager.getAddresses();
  }

  /**
   * Get information about the current provider
   */
  getCurrentProviderInfo(): ProviderPreference | null {
    return this.providerManager.getCurrentProviderInfo();
  }

  /**
   * Get the wallet ID (for embedded wallets)
   */
  getWalletId(): string | null {
    return this.providerManager.getWalletId();
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if Phantom extension is installed
   */
  static isPhantomInstalled(): boolean {
    return isPhantomExtensionInstalled();
  }

  /**
   * Add event listener for provider events (connect, connect_start, connect_error, disconnect, error)
   * Works with both embedded and injected providers
   */
  on(event: EmbeddedProviderEvent, callback: EventCallback): void {
    debug.log(DebugCategory.BROWSER_SDK, "Adding event listener", { event });
    this.providerManager.on(event, callback);
  }

  /**
   * Remove event listener for provider events
   * Works with both embedded and injected providers
   */
  off(event: EmbeddedProviderEvent, callback: EventCallback): void {
    debug.log(DebugCategory.BROWSER_SDK, "Removing event listener", { event });
    this.providerManager.off(event, callback);
  }

  /**
   * Attempt auto-connection using existing session
   * Should be called after setting up event listeners
   * Only works with embedded providers
   */
  async autoConnect(): Promise<void> {
    debug.log(DebugCategory.BROWSER_SDK, "Attempting auto-connect");
    const currentProvider = this.providerManager.getCurrentProvider();
    if (currentProvider && 'autoConnect' in currentProvider) {
      await (currentProvider as any).autoConnect();
    } else {
      debug.warn(DebugCategory.BROWSER_SDK, "Current provider does not support auto-connect", {
        providerType: this.getCurrentProviderInfo()?.type,
      });
    }
  }

  /**
   * Debug configuration methods
   * These allow dynamic debug configuration without SDK reinstantiation
   */

  /**
   * Enable debug logging
   */
  enableDebug(): void {
    debug.enable();
    debug.info(DebugCategory.BROWSER_SDK, "Debug logging enabled");
  }

  /**
   * Disable debug logging
   */
  disableDebug(): void {
    debug.disable();
  }

  /**
   * Set debug level
   */
  setDebugLevel(level: DebugLevel): void {
    debug.setLevel(level);
    debug.info(DebugCategory.BROWSER_SDK, "Debug level updated", { level });
  }

  /**
   * Set debug callback function
   */
  setDebugCallback(callback: DebugCallback): void {
    debug.setCallback(callback);
    debug.info(DebugCategory.BROWSER_SDK, "Debug callback updated");
  }

  /**
   * Configure debug settings all at once
   */
  configureDebug(config: { enabled?: boolean; level?: DebugLevel; callback?: DebugCallback }): void {
    if (config.enabled !== undefined) {
      if (config.enabled) {
        this.enableDebug();
      } else {
        this.disableDebug();
      }
    }
    
    if (config.level !== undefined) {
      this.setDebugLevel(config.level);
    }
    
    if (config.callback !== undefined) {
      this.setDebugCallback(config.callback);
    }
  }
}
