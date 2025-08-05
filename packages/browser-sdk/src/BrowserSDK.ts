import type {
  BrowserSDKConfig,
  ConnectResult,
  SignedTransaction,
  WalletAddress,
  SignAndSendTransactionParams,
  CreateUserOrganizationParams,
  CreateUserOrganizationResult,
  SignMessageParams,
  AuthOptions,
} from "./types";
import { ProviderManager, type SwitchProviderOptions, type ProviderPreference } from "./ProviderManager";
import { isPhantomExtensionInstalled } from "@phantom/browser-injected-sdk";
import { debug, DebugCategory } from "./debug";
export class BrowserSDK {
  private providerManager: ProviderManager;
  private config: BrowserSDKConfig;

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

    debug.info(DebugCategory.BROWSER_SDK, 'Initializing BrowserSDK', { 
      providerType: config.providerType,
      embeddedWalletType: config.embeddedWalletType,
      addressTypes: config.addressTypes,
      debugEnabled: config.debug?.enabled 
    });

    // Validate providerType
    if (!["injected", "embedded"].includes(config.providerType)) {
      debug.error(DebugCategory.BROWSER_SDK, 'Invalid providerType', { providerType: config.providerType });
      throw new Error(`Invalid providerType: ${config.providerType}. Must be "injected" or "embedded".`);
    }

    const embeddedWalletType = config.embeddedWalletType || "app-wallet";

    // Validate embeddedWalletType if provided
    if (config.providerType === "embedded" && !["app-wallet", "user-wallet"].includes(embeddedWalletType)) {
      debug.error(DebugCategory.BROWSER_SDK, 'Invalid embeddedWalletType', { embeddedWalletType: config.embeddedWalletType });
      throw new Error(
        `Invalid embeddedWalletType: ${config.embeddedWalletType}. Must be "app-wallet" or "user-wallet".`,
      );
    }

    config.embeddedWalletType = embeddedWalletType as "app-wallet" | "user-wallet";

    this.config = config;
    debug.log(DebugCategory.BROWSER_SDK, 'Creating ProviderManager', { config });
    this.providerManager = new ProviderManager(config);
    debug.info(DebugCategory.BROWSER_SDK, 'BrowserSDK initialized successfully');
  }

  /**
   * Connect to the wallet with optional provider switching
   */
  async connect(options?: {
    providerType?: "injected" | "embedded" | (string & Record<never, never>);
    embeddedWalletType?: "app-wallet" | "user-wallet" | (string & Record<never, never>);
    authOptions?: AuthOptions;
  }): Promise<ConnectResult> {
    debug.info(DebugCategory.BROWSER_SDK, 'Starting connect process', { options });

    // Switch provider if requested
    if (options?.providerType) {
      debug.log(DebugCategory.BROWSER_SDK, 'Provider switch requested', { 
        providerType: options.providerType,
        embeddedWalletType: options.embeddedWalletType 
      });

      // Validate providerType
      if (!["injected", "embedded"].includes(options.providerType)) {
        debug.error(DebugCategory.BROWSER_SDK, 'Invalid providerType in connect options', { providerType: options.providerType });
        throw new Error(`Invalid providerType: ${options.providerType}. Must be "injected" or "embedded".`);
      }

      // Validate embeddedWalletType if provided
      if (options.embeddedWalletType && !["app-wallet", "user-wallet"].includes(options.embeddedWalletType)) {
        debug.error(DebugCategory.BROWSER_SDK, 'Invalid embeddedWalletType in connect options', { embeddedWalletType: options.embeddedWalletType });
        throw new Error(
          `Invalid embeddedWalletType: ${options.embeddedWalletType}. Must be "app-wallet" or "user-wallet".`,
        );
      }

      debug.log(DebugCategory.BROWSER_SDK, 'Switching provider', { 
        providerType: options.providerType,
        embeddedWalletType: options.embeddedWalletType 
      });

      await this.providerManager.switchProvider(options.providerType as "injected" | "embedded", {
        embeddedWalletType: options.embeddedWalletType as "app-wallet" | "user-wallet",
      });
    }

    debug.log(DebugCategory.BROWSER_SDK, 'Delegating to ProviderManager.connect', { authOptions: options?.authOptions });
    const result = await this.providerManager.connect(options?.authOptions);
    debug.info(DebugCategory.BROWSER_SDK, 'Connect completed successfully', result);
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
  async signMessage(params: SignMessageParams): Promise<string> {
    return this.providerManager.signMessage(params);
  }

  /**
   * Sign and send a transaction
   * @param params - Transaction parameters with native transaction object
   * @returns Transaction result
   */
  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<SignedTransaction> {
    return this.providerManager.signAndSendTransaction(params);
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
   * Create a user organization via your backend API
   * @param params - Parameters including userId and any additional options
   * @returns Organization creation result with organizationId
   */
  async createUserOrganization(params: CreateUserOrganizationParams): Promise<CreateUserOrganizationResult> {
    if (!this.config.serverUrl) {
      throw new Error("serverUrl is required in config to create user organizations");
    }

    try {
      const response = await fetch(`${this.config.serverUrl}/organizations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to create organization: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result as CreateUserOrganizationResult;
    } catch (error) {
      throw new Error(`Error creating user organization: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
