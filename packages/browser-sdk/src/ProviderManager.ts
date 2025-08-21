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
import type { EmbeddedProviderEvent, EventCallback } from "@phantom/embedded-provider-core";

export interface ProviderPreference {
  type: "injected" | "embedded";
  embeddedWalletType?: "app-wallet" | "user-wallet";
}

export interface SwitchProviderOptions {
  embeddedWalletType?: "app-wallet" | "user-wallet" | (string & Record<never, never>);
}

export interface EventEmitter {
  on(event: EmbeddedProviderEvent, callback: EventCallback): void;
  off(event: EmbeddedProviderEvent, callback: EventCallback): void;
}

export class ProviderManager implements EventEmitter {
  private providers = new Map<string, Provider>();
  private currentProvider: Provider | null = null;
  private currentProviderKey: string | null = null;
  private walletId: string | null = null;
  private config: BrowserSDKConfig;
  
  // Event management for forwarding provider events
  private eventListeners: Map<EmbeddedProviderEvent, Set<EventCallback>> = new Map();
  private providerForwardingSetup = new WeakSet<Provider>(); // Track which providers have forwarding set up

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

    // Set up event forwarding from the new provider
    this.ensureProviderEventForwarding();

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
   * Add event listener - stores callback and ensures current provider forwards events to ProviderManager
   */
  on(event: EmbeddedProviderEvent, callback: EventCallback): void {
    debug.log(DebugCategory.PROVIDER_MANAGER, "Adding event listener", { event });
    
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    
    // Ensure current provider is set up to forward events to us
    this.ensureProviderEventForwarding();
  }

  /**
   * Remove event listener
   */
  off(event: EmbeddedProviderEvent, callback: EventCallback): void {
    debug.log(DebugCategory.PROVIDER_MANAGER, "Removing event listener", { event });
    
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.delete(callback);
      if (this.eventListeners.get(event)!.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  /**
   * Emit event to all registered callbacks
   */
  private emit(event: EmbeddedProviderEvent, data?: any): void {
    debug.log(DebugCategory.PROVIDER_MANAGER, "Emitting event to stored callbacks", { 
      event, 
      listenerCount: this.eventListeners.get(event)?.size || 0,
      data 
    });
    
    const listeners = this.eventListeners.get(event);
    if (listeners && listeners.size > 0) {
      listeners.forEach(callback => {
        try {
          debug.log(DebugCategory.PROVIDER_MANAGER, "Calling stored callback for event", { event });
          callback(data);
        } catch (error) {
          debug.error(DebugCategory.PROVIDER_MANAGER, "Event callback error", { event, error });
        }
      });
    } else {
      debug.warn(DebugCategory.PROVIDER_MANAGER, "No stored callbacks for event", { event });
    }
  }

  /**
   * Ensure current provider forwards its events to this ProviderManager
   * Only sets up forwarding once per provider instance to avoid accumulation
   */
  private ensureProviderEventForwarding(): void {
    if (!this.currentProvider || !('on' in this.currentProvider)) {
      debug.warn(DebugCategory.PROVIDER_MANAGER, "Current provider does not support events", {
        providerType: this.getCurrentProviderInfo()?.type,
      });
      return;
    }

    // Check if we've already set up forwarding for this provider instance
    if (this.providerForwardingSetup.has(this.currentProvider)) {
      debug.log(DebugCategory.PROVIDER_MANAGER, "Event forwarding already set up for current provider");
      return;
    }

    debug.log(DebugCategory.PROVIDER_MANAGER, "Setting up event forwarding from current provider");

    // Set up forwarding for each event type
    const eventsToForward: EmbeddedProviderEvent[] = ["connect_start", "connect", "connect_error", "disconnect", "error"];
    
    for (const event of eventsToForward) {
      // Set up a single forwarding callback that emits to our listeners
      const forwardingCallback = (data: any) => {
        debug.log(DebugCategory.PROVIDER_MANAGER, "Forwarding event from provider", { event, data });
        this.emit(event, data);
      };
      
      debug.log(DebugCategory.PROVIDER_MANAGER, "Attaching forwarding callback for event", { event });
      (this.currentProvider as any).on(event, forwardingCallback);
    }

    // Mark this provider as having forwarding set up
    this.providerForwardingSetup.add(this.currentProvider);
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
        solanaProvider: (this.config.solanaProvider || "web3js") as "web3js" | "kit",
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
        solanaProvider: (this.config.solanaProvider || "web3js") as "web3js" | "kit",
        appLogo: this.config.appLogo, // Optional app logo URL
        appName: this.config.appName
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
