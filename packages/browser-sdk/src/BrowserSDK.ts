import type { BrowserSDKConfig, ConnectResult, WalletAddress, BrowserAuthOptions } from "./types";
import { ProviderManager, type SwitchProviderOptions, type ProviderPreference } from "./ProviderManager";
import { debug, DebugCategory, type DebugLevel, type DebugCallback } from "./debug";
import { waitForPhantomExtension } from "./waitForPhantomExtension";
import type { ISolanaChain, IEthereumChain } from "@phantom/chain-interfaces";
import type { EmbeddedProviderEvent, EventCallback } from "@phantom/embedded-provider-core";
import type { InjectedProvider } from "./providers/injected";
import { DEFAULT_EMBEDDED_WALLET_TYPE } from "@phantom/constants";
import type {
  AutoConfirmEnableParams,
  AutoConfirmResult,
  AutoConfirmSupportedChainsResult,
} from "@phantom/browser-injected-sdk/auto-confirm";

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
      appId: config.appId,
      embeddedWalletType: config.embeddedWalletType,
      addressTypes: config.addressTypes,
    });

    // Validate required appId
    if (!config.appId) {
      debug.error(DebugCategory.BROWSER_SDK, "Missing required appId");
      throw new Error("appId is required for BrowserSDK initialization");
    }

    const embeddedWalletType = config.embeddedWalletType || DEFAULT_EMBEDDED_WALLET_TYPE;

    // Validate embeddedWalletType if provided
    if (config.embeddedWalletType && !["app-wallet", "user-wallet"].includes(embeddedWalletType)) {
      debug.error(DebugCategory.BROWSER_SDK, "Invalid embeddedWalletType", {
        embeddedWalletType: config.embeddedWalletType,
      });
      throw new Error(
        `Invalid embeddedWalletType: ${config.embeddedWalletType}. Must be "app-wallet" or "user-wallet".`,
      );
    }

    // Create ProviderManager with the unified config
    // The ProviderManager will handle provider switching dynamically
    this.providerManager = new ProviderManager(config);
  }

  // ===== CHAIN API =====

  /**
   * Access Solana chain operations
   */
  get solana(): ISolanaChain {
    const currentProvider = this.providerManager.getCurrentProvider();
    if (!currentProvider) {
      throw new Error("No provider available. Call connect() first.");
    }
    return currentProvider.solana;
  }

  /**
   * Access Ethereum chain operations
   */
  get ethereum(): IEthereumChain {
    const currentProvider = this.providerManager.getCurrentProvider();
    if (!currentProvider) {
      throw new Error("No provider available. Call connect() first.");
    }
    return currentProvider.ethereum;
  }

  // ===== CONNECTION MANAGEMENT =====

  /**
   * Connect to the wallet with optional provider type selection
   */
  async connect(options?: BrowserAuthOptions): Promise<ConnectResult> {
    debug.info(DebugCategory.BROWSER_SDK, "Starting connection", options);

    try {
      if (options?.providerType && options.providerType !== this.providerManager.getCurrentProviderInfo()?.type) {
        debug.info(DebugCategory.BROWSER_SDK, "Switching provider before connect", {
          providerType: options.providerType,
        });
        await this.providerManager.switchProvider(options.providerType);
      }
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
        error: (error as Error).message,
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
  static async isPhantomInstalled(timeoutMs?: number): Promise<boolean> {
    return waitForPhantomExtension(timeoutMs);
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
   * Smart auto-connection that determines the best provider to use
   * Uses heuristics to decide between embedded and injected providers:
   * 1. Check if coming back from authentication callback (has URL params)
   * 2. Check if embedded provider has a recoverable session
   * 3. Check if Phantom extension is installed for trusted connection
   * 4. Fall back to no auto-connection
   * Should be called after setting up event listeners
   */
  async autoConnect(): Promise<void> {
    debug.log(DebugCategory.BROWSER_SDK, "Starting smart auto-connect");

    try {
      // Step 1: Check if we have an embedded provider instance to query for session info
      let embeddedProvider: any = null;
      try {
        // Try to get or create embedded provider for session checks
        await this.providerManager.switchProvider("embedded");
        embeddedProvider = this.providerManager.getCurrentProvider();
      } catch (error) {
        debug.log(DebugCategory.BROWSER_SDK, "Could not access embedded provider for session checks", { error });
      }

      // Step 2: Check session recovery capabilities
      let sessionInfo: any = null;
      if (embeddedProvider && "getSessionRecoveryInfo" in embeddedProvider) {
        sessionInfo = await embeddedProvider.getSessionRecoveryInfo();
        debug.log(DebugCategory.BROWSER_SDK, "Session recovery info", sessionInfo);
      }

      // Step 3: Check if Phantom extension is available
      const isExtensionInstalled = await BrowserSDK.isPhantomInstalled(1000); // 1 second timeout
      debug.log(DebugCategory.BROWSER_SDK, "Extension installation check", { isExtensionInstalled });

      // Step 4: Apply heuristics to determine best provider
      let selectedProvider: "embedded" | "injected" | null = null;

      if (sessionInfo?.canAutoRecover) {
        // Priority 1: Embedded provider can auto-recover session
        selectedProvider = "embedded";
        debug.info(DebugCategory.BROWSER_SDK, "Auto-connect: Using embedded provider (can recover session)", {
          hasCompletedSession: sessionInfo.sessionStatus === "completed",
          hasPendingWithUrl: sessionInfo.hasUrlParams,
        });
      } else if (isExtensionInstalled) {
        // Priority 2: Try injected provider if extension is available
        selectedProvider = "injected";
        debug.info(DebugCategory.BROWSER_SDK, "Auto-connect: Using injected provider (extension available)");
      } else {
        // No auto-connect possible
        debug.info(DebugCategory.BROWSER_SDK, "Auto-connect: No suitable provider found", {
          hasSession: sessionInfo?.hasSession,
          sessionCanRecover: sessionInfo?.canAutoRecover,
          extensionInstalled: isExtensionInstalled,
        });
        return;
      }

      // Step 5: Switch to selected provider and attempt auto-connect
      await this.providerManager.switchProvider(selectedProvider);
      const provider = this.providerManager.getCurrentProvider();

      if (provider && "autoConnect" in provider) {
        await (provider as any).autoConnect();
        debug.info(DebugCategory.BROWSER_SDK, "Smart auto-connect successful", {
          selectedProvider,
          connected: this.isConnected(),
        });
      } else {
        debug.warn(DebugCategory.BROWSER_SDK, "Selected provider does not support auto-connect", {
          selectedProvider,
        });
      }

    } catch (error) {
      debug.warn(DebugCategory.BROWSER_SDK, "Smart auto-connect failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Auto-connect failures should not throw - they should fail silently
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

  // ===== AUTO-CONFIRM METHODS (Injected Provider Only) =====

  /**
   * Enable auto-confirm for transactions
   * Only available for injected providers
   */
  async enableAutoConfirm(params: AutoConfirmEnableParams): Promise<AutoConfirmResult> {
    debug.info(DebugCategory.BROWSER_SDK, "Enabling auto-confirm", { params });

    const currentProvider = this.providerManager.getCurrentProvider();
    if (!currentProvider) {
      throw new Error("No provider available. Call connect() first.");
    }

    if (!("enableAutoConfirm" in currentProvider)) {
      throw new Error("Auto-confirm is only available for injected providers");
    }

    try {
      const result = await (currentProvider as InjectedProvider).enableAutoConfirm(params);
      debug.info(DebugCategory.BROWSER_SDK, "Auto-confirm enabled successfully", { result });
      return result;
    } catch (error) {
      debug.error(DebugCategory.BROWSER_SDK, "Failed to enable auto-confirm", { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Disable auto-confirm for transactions
   * Only available for injected providers
   */
  async disableAutoConfirm(): Promise<void> {
    debug.info(DebugCategory.BROWSER_SDK, "Disabling auto-confirm");

    const currentProvider = this.providerManager.getCurrentProvider();
    if (!currentProvider) {
      throw new Error("No provider available. Call connect() first.");
    }

    if (!("disableAutoConfirm" in currentProvider)) {
      throw new Error("Auto-confirm is only available for injected providers");
    }

    try {
      await (currentProvider as InjectedProvider).disableAutoConfirm();
      debug.info(DebugCategory.BROWSER_SDK, "Auto-confirm disabled successfully");
    } catch (error) {
      debug.error(DebugCategory.BROWSER_SDK, "Failed to disable auto-confirm", { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get current auto-confirm status
   * Only available for injected providers
   */
  async getAutoConfirmStatus(): Promise<AutoConfirmResult> {
    debug.info(DebugCategory.BROWSER_SDK, "Getting auto-confirm status");

    const currentProvider = this.providerManager.getCurrentProvider();
    if (!currentProvider) {
      throw new Error("No provider available. Call connect() first.");
    }

    if (!("getAutoConfirmStatus" in currentProvider)) {
      throw new Error("Auto-confirm is only available for injected providers");
    }

    try {
      const result = await (currentProvider as InjectedProvider).getAutoConfirmStatus();
      debug.info(DebugCategory.BROWSER_SDK, "Got auto-confirm status", { result });
      return result;
    } catch (error) {
      debug.error(DebugCategory.BROWSER_SDK, "Failed to get auto-confirm status", { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get supported chains for auto-confirm
   * Only available for injected providers
   */
  async getSupportedAutoConfirmChains(): Promise<AutoConfirmSupportedChainsResult> {
    debug.info(DebugCategory.BROWSER_SDK, "Getting supported auto-confirm chains");

    const currentProvider = this.providerManager.getCurrentProvider();
    if (!currentProvider) {
      throw new Error("No provider available. Call connect() first.");
    }

    if (!("getSupportedAutoConfirmChains" in currentProvider)) {
      throw new Error("Auto-confirm is only available for injected providers");
    }

    try {
      const result = await (currentProvider as InjectedProvider).getSupportedAutoConfirmChains();
      debug.info(DebugCategory.BROWSER_SDK, "Got supported auto-confirm chains", { result });
      return result;
    } catch (error) {
      debug.error(DebugCategory.BROWSER_SDK, "Failed to get supported auto-confirm chains", {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
