import type {
  BrowserSDKConfig,
  ConnectResult,
  WalletAddress,
  AuthOptions,
  AuthProviderType,
  AddressType,
} from "./types";
import { ProviderManager, type ProviderPreference } from "./ProviderManager";
import { debug, DebugCategory, type DebugLevel, type DebugCallback } from "./debug";
import type { ISolanaChain, IEthereumChain } from "@phantom/chain-interfaces";
import type { EmbeddedProviderEvent, EventCallback } from "@phantom/embedded-provider-core";
import { EMBEDDED_PROVIDER_AUTH_TYPES } from "@phantom/embedded-provider-core";
import type { InjectedProvider } from "./providers/injected";
import { DEFAULT_EMBEDDED_WALLET_TYPE } from "@phantom/constants";
import type { InjectedWalletInfo } from "./wallets/registry";
import { getWalletRegistry } from "./wallets/registry";
import type {
  AutoConfirmEnableParams,
  AutoConfirmResult,
  AutoConfirmSupportedChainsResult,
} from "@phantom/browser-injected-sdk/auto-confirm";

const BROWSER_SDK_PROVIDER_TYPES: readonly AuthProviderType[] = [
  ...EMBEDDED_PROVIDER_AUTH_TYPES,
  "injected",
  "deeplink",
] as const;

export class BrowserSDK {
  private providerManager: ProviderManager;
  private walletRegistry = getWalletRegistry();
  private config: BrowserSDKConfig;
  public isLoading = true;

  constructor(config: BrowserSDKConfig) {
    debug.info(DebugCategory.BROWSER_SDK, "Initializing BrowserSDK", {
      providers: config.providers,
      embeddedWalletType: config.embeddedWalletType,
      addressTypes: config.addressTypes,
    });

    // Validate providers array
    if (!Array.isArray(config.providers) || config.providers.length === 0) {
      debug.error(DebugCategory.BROWSER_SDK, "Invalid providers array", { providers: config.providers });
      throw new Error("providers must be a non-empty array of AuthProviderType");
    }

    // Validate each provider is a valid AuthProviderType
    const invalidProviders = config.providers.filter(p => !BROWSER_SDK_PROVIDER_TYPES.includes(p));
    if (invalidProviders.length > 0) {
      debug.error(DebugCategory.BROWSER_SDK, "Invalid provider types", {
        invalidProviders,
        validProviders: BROWSER_SDK_PROVIDER_TYPES,
      });
      throw new Error(
        `Invalid provider type(s): ${invalidProviders.join(", ")}. Valid providers are: ${BROWSER_SDK_PROVIDER_TYPES.join(", ")}`,
      );
    }

    // Check if any embedded providers are included (non-"injected")
    const hasEmbeddedProviders = config.providers.some(p => p !== "injected");

    // Validate that appId is provided if using embedded providers
    if (hasEmbeddedProviders && !config.appId) {
      debug.error(DebugCategory.BROWSER_SDK, "appId required for embedded providers", {
        providers: config.providers,
      });
      throw new Error("appId is required when using embedded providers (google, apple, phantom, etc.)");
    }

    const embeddedWalletType = config.embeddedWalletType || DEFAULT_EMBEDDED_WALLET_TYPE;

    // Validate embeddedWalletType if provided
    if (!["app-wallet", "user-wallet"].includes(embeddedWalletType)) {
      debug.error(DebugCategory.BROWSER_SDK, "Invalid embeddedWalletType", {
        embeddedWalletType: config.embeddedWalletType,
      });
      throw new Error(
        `Invalid embeddedWalletType: ${config.embeddedWalletType}. Must be "app-wallet" or "user-wallet".`,
      );
    }

    this.config = config;
    this.providerManager = new ProviderManager(config);

    // Start wallet discovery (non-blocking)

    void this.discoverWallets();
  }

  discoverWallets(): Promise<void> {
    return this.walletRegistry.discover(this.config.addressTypes).finally(() => {
      this.isLoading = false;
    });
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
   * Connect to the wallet
   */
  async connect(options: AuthOptions): Promise<ConnectResult> {
    debug.info(DebugCategory.BROWSER_SDK, "Starting connection", options);

    try {
      const result = await this.providerManager.connect(options);

      debug.info(DebugCategory.BROWSER_SDK, "Connection successful", {
        addressCount: result.addresses.length,
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
   * Get enabled address types for the current provider
   * - For embedded provider: returns config.addressTypes
   * - For Phantom injected: returns config.addressTypes
   * - For discovered wallets: returns the wallet's addressTypes from registry
   */
  getEnabledAddressTypes(): AddressType[] {
    const currentProvider = this.providerManager.getCurrentProvider();
    if (!currentProvider) {
      return [];
    }

    return currentProvider.getEnabledAddressTypes();
  }

  // ===== UTILITY METHODS =====

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
   * Tries embedded provider first, then injected provider as fallback
   */
  async autoConnect(): Promise<void> {
    debug.log(DebugCategory.BROWSER_SDK, "Attempting auto-connect with fallback strategy");

    const result = await this.providerManager.autoConnect();

    if (result) {
      debug.info(DebugCategory.BROWSER_SDK, "Auto-connect successful", {
        providerType: this.getCurrentProviderInfo()?.type,
      });
    } else {
      debug.log(DebugCategory.BROWSER_SDK, "Auto-connect failed for all providers");
    }
  }

  enableDebug(): void {
    debug.enable();
    debug.info(DebugCategory.BROWSER_SDK, "Debug logging enabled");
  }

  disableDebug(): void {
    debug.disable();
  }

  setDebugLevel(level: DebugLevel): void {
    debug.setLevel(level);
    debug.info(DebugCategory.BROWSER_SDK, "Debug level updated", { level });
  }

  setDebugCallback(callback: DebugCallback): void {
    debug.setCallback(callback);
    debug.info(DebugCategory.BROWSER_SDK, "Debug callback updated");
  }

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

  getDiscoveredWallets(): InjectedWalletInfo[] {
    debug.log(DebugCategory.BROWSER_SDK, "Getting discovered wallets");

    try {
      const allWallets = this.walletRegistry.getByAddressTypes(this.config.addressTypes);
      debug.log(DebugCategory.BROWSER_SDK, "Retrieved discovered wallets", {
        count: allWallets.length,
        walletIds: allWallets.map(w => w.id),
      });
      return allWallets;
    } catch (error) {
      debug.error(DebugCategory.BROWSER_SDK, "Failed to get discovered wallets", {
        error: (error as Error).message,
      });
      return [];
    }
  }
}
