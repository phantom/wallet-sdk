import type {
  BrowserSDKConfig,
  ConnectResult,
  SignedTransaction,
  WalletAddress,
  SignAndSendTransactionParams,
  CreateUserOrganizationParams,
  CreateUserOrganizationResult,
} from "./types";
import type { NetworkId } from "@phantom/client";
import { ProviderManager, type SwitchProviderOptions, type ProviderPreference } from "./ProviderManager";
import { isPhantomExtensionInstalled } from "@phantom/browser-injected-sdk";
export class BrowserSDK {
  private providerManager: ProviderManager;
  private config: BrowserSDKConfig;

  constructor(config: BrowserSDKConfig) {
    // Validate providerType
    if (!["injected", "embedded"].includes(config.providerType)) {
      throw new Error(`Invalid providerType: ${config.providerType}. Must be "injected" or "embedded".`);
    }

    const embeddedWalletType = config.embeddedWalletType || "app-wallet";

    // Validate embeddedWalletType if provided
    if (config.providerType === "embedded" && !["app-wallet", "user-wallet"].includes(embeddedWalletType)) {
      throw new Error(
        `Invalid embeddedWalletType: ${config.embeddedWalletType}. Must be "app-wallet" or "user-wallet".`,
      );
    }

    config.embeddedWalletType = embeddedWalletType as "app-wallet" | "user-wallet";

    this.config = config;
    this.providerManager = new ProviderManager(config);
  }

  /**
   * Connect to the wallet with optional provider switching
   */
  async connect(options?: {
    providerType?: "injected" | "embedded" | (string & Record<never, never>);
    embeddedWalletType?: "app-wallet" | "user-wallet" | (string & Record<never, never>);
  }): Promise<ConnectResult> {
    // Switch provider if requested
    if (options?.providerType) {
      // Validate providerType
      if (!["injected", "embedded"].includes(options.providerType)) {
        throw new Error(`Invalid providerType: ${options.providerType}. Must be "injected" or "embedded".`);
      }

      // Validate embeddedWalletType if provided
      if (options.embeddedWalletType && !["app-wallet", "user-wallet"].includes(options.embeddedWalletType)) {
        throw new Error(
          `Invalid embeddedWalletType: ${options.embeddedWalletType}. Must be "app-wallet" or "user-wallet".`,
        );
      }

      await this.providerManager.switchProvider(options.providerType as "injected" | "embedded", {
        embeddedWalletType: options.embeddedWalletType as "app-wallet" | "user-wallet",
      });
    }

    return this.providerManager.connect();
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
  async signMessage(message: string, networkId: NetworkId): Promise<string> {
    return this.providerManager.signMessage(message, networkId);
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
