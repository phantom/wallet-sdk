import type {
  BrowserSDKConfig,
  ConnectResult,
  SignedTransaction,
  WalletAddress,
  SignAndSendTransactionParams,
  SignMessageParams,
  SignMessageResult,
  AuthOptions,
} from "./types";
import { ProviderManager, type SwitchProviderOptions, type ProviderPreference } from "./ProviderManager";
import { isPhantomExtensionInstalled } from "@phantom/browser-injected-sdk";
import { debug, DebugCategory } from "./debug";
import type { EmbeddedProviderEvent, EventCallback } from "@phantom/embedded-provider-core";

export class BrowserSDK {
  private providerManager: ProviderManager;

  constructor(config: BrowserSDKConfig) {
    // Initialize debugging if configured
    if (config.debug?.enabled) {
      debug.enable();
      if (config.debug.level !== undefined) {
        debug.setLevel(config.debug.level);
      }
      if (config.debug.callback) {
        debug.setCallback(config.debug.callback);
      }
    }

    debug.info(DebugCategory.BROWSER_SDK, "Initializing BrowserSDK", {
      providerType: config.providerType,
      embeddedWalletType: config.embeddedWalletType,
      addressTypes: config.addressTypes,
      debugEnabled: config.debug?.enabled,
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

    config.embeddedWalletType = embeddedWalletType as "app-wallet" | "user-wallet";

    debug.log(DebugCategory.BROWSER_SDK, "Creating ProviderManager", { config });
    this.providerManager = new ProviderManager(config);
    debug.info(DebugCategory.BROWSER_SDK, "BrowserSDK initialized successfully");
  }

  /**
   * Connect to the wallet with optional provider switching
   */
  async connect(options?: {
    providerType?: "injected" | "embedded" | (string & Record<never, never>);
    embeddedWalletType?: "app-wallet" | "user-wallet" | (string & Record<never, never>);
    authOptions?: AuthOptions;
  }): Promise<ConnectResult> {
    debug.info(DebugCategory.BROWSER_SDK, "Starting connect process", { options });

    // Switch provider if requested
    if (options?.providerType) {
      debug.log(DebugCategory.BROWSER_SDK, "Provider switch requested", {
        providerType: options.providerType,
        embeddedWalletType: options.embeddedWalletType,
      });

      // Validate providerType
      if (!["injected", "embedded"].includes(options.providerType)) {
        debug.error(DebugCategory.BROWSER_SDK, "Invalid providerType in connect options", {
          providerType: options.providerType,
        });
        throw new Error(`Invalid providerType: ${options.providerType}. Must be "injected" or "embedded".`);
      }

      // Validate embeddedWalletType if provided
      if (options.embeddedWalletType && !["app-wallet", "user-wallet"].includes(options.embeddedWalletType)) {
        debug.error(DebugCategory.BROWSER_SDK, "Invalid embeddedWalletType in connect options", {
          embeddedWalletType: options.embeddedWalletType,
        });
        throw new Error(
          `Invalid embeddedWalletType: ${options.embeddedWalletType}. Must be "app-wallet" or "user-wallet".`,
        );
      }

      debug.log(DebugCategory.BROWSER_SDK, "Switching provider", {
        providerType: options.providerType,
        embeddedWalletType: options.embeddedWalletType,
      });

      await this.providerManager.switchProvider(options.providerType as "injected" | "embedded", {
        embeddedWalletType: options.embeddedWalletType as "app-wallet" | "user-wallet",
      });
    }

    debug.log(DebugCategory.BROWSER_SDK, "Delegating to ProviderManager.connect", {
      authOptions: options?.authOptions,
    });
    const result = await this.providerManager.connect(options?.authOptions);
    debug.info(DebugCategory.BROWSER_SDK, "Connect completed successfully", result);
    return result;
  }

  /**
   * Switch to a different provider type
   */
  async switchProvider(
    type: "injected" | "embedded" | (string & Record<never, never>),
    options?: SwitchProviderOptions,
  ): Promise<void> {
    // Validate providerType
    if (!["injected", "embedded"].includes(type)) {
      throw new Error(`Invalid providerType: ${type}. Must be "injected" or "embedded".`);
    }

    await this.providerManager.switchProvider(type as "injected" | "embedded", options);
  }

  /**
   * Get current provider information
   */
  getCurrentProviderInfo(): ProviderPreference | null {
    return this.providerManager.getCurrentProviderInfo();
  }

  /**
   * Wait for Phantom extension to become available
   */
  async waitForPhantomExtension(timeoutMs?: number): Promise<boolean> {
    const isInstalled = async (retries = 3, timeAccumulated = 0): Promise<boolean> => {
      const installed = isPhantomExtensionInstalled();
      if (installed) return true;
      if (retries <= 0) return false;
      if (timeAccumulated >= (timeoutMs || 3000)) return false;

      return new Promise(resolve => {
        setTimeout(async () => {
          const result = await isInstalled(retries - 1, timeAccumulated + 100);
          resolve(result);
        }, 100);
      });
    };
    return isInstalled();
  }

  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    return this.providerManager.disconnect();
  }

  /**
   * Sign a message
   * @param message - Message string to sign
   * @param networkId - Network identifier
   * @returns Signature string
   */
  async signMessage(params: SignMessageParams): Promise<SignMessageResult> {
    debug.info(DebugCategory.BROWSER_SDK, "Signing message", {
      message: params.message,
      networkId: params.networkId,
    });
    const result = await this.providerManager.signMessage(params);
    debug.info(DebugCategory.BROWSER_SDK, "Message signed successfully", {
      message: params.message,
      networkId: params.networkId,
      result: result,
    });
    return result;
  }

  /**
   * Sign and send a transaction
   * @param params - Transaction parameters with native transaction object
   * @returns Transaction result
   */
  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<SignedTransaction> {
    debug.info(DebugCategory.BROWSER_SDK, "Signing and sending transaction", {
      networkId: params.networkId,
    });
    const result = await this.providerManager.signAndSendTransaction(params);
    debug.info(DebugCategory.BROWSER_SDK, "Transaction signed and sent successfully", {
      networkId: params.networkId,
      result: result,
    });
    return result;
  }

  /**
   * Get wallet addresses
   */
  getAddresses(): WalletAddress[] {
    return this.providerManager.getAddresses();
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.providerManager.isConnected();
  }

  /**
   * Get the current wallet ID (for embedded wallets)
   */
  getWalletId(): string | null {
    return this.providerManager.getWalletId();
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
}
