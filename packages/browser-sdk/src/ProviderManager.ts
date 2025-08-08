import type {
  BrowserSDKConfig,
  Provider,
  ConnectResult,
  SignedTransaction,
  WalletAddress,
  SignAndSendTransactionParams,
  SignMessageParams,
  SignMessageResult,
  AuthOptions,
} from "./types";
import { InjectedProvider } from "./providers/injected";
import { EmbeddedProvider } from "./providers/embedded";
import { debug, DebugCategory } from "./debug";

export interface ProviderPreference {
  type: "injected" | "embedded";
  embeddedWalletType?: "app-wallet" | "user-wallet";
}

export interface SwitchProviderOptions {
  embeddedWalletType?: "app-wallet" | "user-wallet" | (string & Record<never, never>);
}

export class ProviderManager {
  private providers = new Map<string, Provider>();
  private currentProvider: Provider | null = null;
  private currentProviderKey: string | null = null;
  private walletId: string | null = null;
  private config: BrowserSDKConfig;

  constructor(config: BrowserSDKConfig) {
    debug.log(DebugCategory.PROVIDER_MANAGER, "Initializing ProviderManager", { config });
    this.config = config;

    // Initialize default provider based on config
    debug.log(DebugCategory.PROVIDER_MANAGER, "Setting default provider");
    this.setDefaultProvider();

    // Restore previous choice from localStorage if available
    // this.restoreProviderPreference();
    debug.info(DebugCategory.PROVIDER_MANAGER, "ProviderManager initialized", {
      currentProviderKey: this.currentProviderKey,
    });
  }

  /**
   * Switch to a different provider type
   */
  switchProvider(type: "injected" | "embedded", options?: SwitchProviderOptions): Provider {
    // Validate embeddedWalletType if provided
    if (options?.embeddedWalletType && !["app-wallet", "user-wallet"].includes(options.embeddedWalletType)) {
      throw new Error(
        `Invalid embeddedWalletType: ${options.embeddedWalletType}. Must be "app-wallet" or "user-wallet".`,
      );
    }

    const key = this.getProviderKey(type, options?.embeddedWalletType as "app-wallet" | "user-wallet" | undefined);

    if (!this.providers.has(key)) {
      this.createProvider(type, options?.embeddedWalletType as "app-wallet" | "user-wallet" | undefined);
    }

    this.currentProvider = this.providers.get(key)!;
    this.currentProviderKey = key;

    // Reset wallet state when switching providers
    this.walletId = null;

    return this.currentProvider;
  }

  /**
   * Get the current active provider
   */
  getCurrentProvider(): Provider | null {
    return this.currentProvider;
  }

  /**
   * Get current provider type and options
   */
  getCurrentProviderInfo(): ProviderPreference | null {
    if (!this.currentProviderKey) return null;

    const [type, embeddedWalletType] = this.currentProviderKey.split("-");
    return {
      type: type as "injected" | "embedded",
      embeddedWalletType: embeddedWalletType as "app-wallet" | "user-wallet" | undefined,
    };
  }

  /**
   * Connect using the current provider
   */
  async connect(authOptions?: AuthOptions): Promise<ConnectResult> {
    debug.info(DebugCategory.PROVIDER_MANAGER, "Starting connection", {
      currentProviderKey: this.currentProviderKey,
      authOptions: authOptions ? { provider: authOptions.provider, hasJwtToken: !!authOptions.jwtToken } : undefined,
    });

    if (!this.currentProvider) {
      debug.error(DebugCategory.PROVIDER_MANAGER, "No provider selected");
      throw new Error("No provider selected");
    }

    debug.log(DebugCategory.PROVIDER_MANAGER, "Delegating to provider connect method");
    const result = await this.currentProvider.connect(authOptions);
    this.walletId = result.walletId || null;

    debug.log(DebugCategory.PROVIDER_MANAGER, "Connection successful, saving preferences", {
      walletId: this.walletId,
      addressCount: result.addresses?.length || 0,
    });

    // Save provider preference after successful connection
    this.saveProviderPreference();

    debug.info(DebugCategory.PROVIDER_MANAGER, "Connect completed", {
      walletId: this.walletId,
      addresses: result.addresses,
    });
    return result;
  }

  /**
   * Disconnect from current provider
   */
  async disconnect(): Promise<void> {
    if (!this.currentProvider) return;

    await this.currentProvider.disconnect();
    this.walletId = null;
  }

  /**
   * Sign a message using current provider
   */
  async signMessage(params: SignMessageParams): Promise<SignMessageResult> {
    if (!this.currentProvider) {
      throw new Error("No provider connected");
    }

    return this.currentProvider.signMessage(params);
  }

  /**
   * Sign and send transaction using current provider
   */
  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<SignedTransaction> {
    if (!this.currentProvider) {
      throw new Error("No provider connected");
    }

    return this.currentProvider.signAndSendTransaction(params);
  }

  /**
   * Get addresses from current provider
   */
  getAddresses(): WalletAddress[] {
    if (!this.currentProvider) {
      return [];
    }

    return this.currentProvider.getAddresses();
  }

  /**
   * Check if current provider is connected
   */
  isConnected(): boolean {
    return this.currentProvider?.isConnected() ?? false;
  }

  /**
   * Get current wallet ID
   */
  getWalletId(): string | null {
    return this.walletId;
  }

  /**
   * Set default provider based on initial config
   */
  private setDefaultProvider(): void {
    const defaultType = (this.config.providerType || "embedded") as "injected" | "embedded";
    const defaultEmbeddedType = (this.config.embeddedWalletType || "app-wallet") as "app-wallet" | "user-wallet";

    this.createProvider(defaultType, defaultEmbeddedType);
    this.switchProvider(defaultType, { embeddedWalletType: defaultEmbeddedType });
  }

  /**
   * Create a provider instance
   */
  private createProvider(type: "injected" | "embedded", embeddedWalletType?: "app-wallet" | "user-wallet"): void {
    const key = this.getProviderKey(type, embeddedWalletType);

    if (this.providers.has(key)) return;

    let provider: Provider;

    if (type === "injected") {
      provider = new InjectedProvider({
        solanaProvider: this.config.solanaProvider || "web3js",
        addressTypes: this.config.addressTypes || [],
      });
    } else {
      if (!this.config.apiBaseUrl || !this.config.organizationId) {
        throw new Error("apiBaseUrl and organizationId are required for embedded provider");
      }

      provider = new EmbeddedProvider({
        apiBaseUrl: this.config.apiBaseUrl,
        organizationId: this.config.organizationId,
        authOptions: this.config.authOptions,
        embeddedWalletType: embeddedWalletType || "app-wallet",
        addressTypes: this.config.addressTypes || [],
        solanaProvider: this.config.solanaProvider || "web3js",
      });
    }

    this.providers.set(key, provider);
  }

  /**
   * Generate a unique key for provider instances
   */
  private getProviderKey(type: "injected" | "embedded", embeddedWalletType?: "app-wallet" | "user-wallet"): string {
    if (type === "injected") {
      return "injected";
    }
    return `embedded-${embeddedWalletType || "app-wallet"}`;
  }

  /**
   * Save provider preference to localStorage
   */
  private saveProviderPreference(): void {
    try {
      const preference = this.getCurrentProviderInfo();
      if (preference) {
        localStorage.setItem("phantom-provider-preference", JSON.stringify(preference));
      }
    } catch (error) {
      // Ignore localStorage errors (e.g., in private browsing mode)
      console.error("Failed to save provider preference:", error);
    }
  }

  /**
   * Restore provider preference from localStorage
   */

  /*
  private restoreProviderPreference(): void {
    try {
      const saved = localStorage.getItem("phantom-provider-preference");
      if (saved) {
        const preference: ProviderPreference = JSON.parse(saved);
        this.switchProvider(preference.type, {
          embeddedWalletType: preference.embeddedWalletType,
        });
      }
    } catch (error) {
      // Ignore localStorage errors - just use default provider
      console.error("Failed to restore provider preference:", error);
    }
  }*/
}
