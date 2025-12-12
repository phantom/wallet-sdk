import {
  type BrowserSDKConfig,
  type Provider,
  type ConnectResult,
  type WalletAddress,
  type AuthOptions,
  AddressType,
} from "./types";
import { InjectedProvider } from "./providers/injected";
import { EmbeddedProvider } from "./providers/embedded";
import { debug, DebugCategory } from "./debug";
import {
  type EmbeddedProviderEvent,
  type EventCallback,
  type EmbeddedProviderAuthType,
  EMBEDDED_PROVIDER_AUTH_TYPES,
} from "@phantom/embedded-provider-core";
import { DEFAULT_WALLET_API_URL, DEFAULT_EMBEDDED_WALLET_TYPE, DEFAULT_AUTH_URL } from "@phantom/constants";
import { isAuthFailureCallback, isAuthCallbackUrl } from "./utils/auth-callback";
import { getDeeplinkToPhantom } from "./utils/deeplink";
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

  private getValidatedCurrentUrl(): string {
    if (typeof window === "undefined") return "";
    const currentUrl = window.location.href;
    if (!currentUrl.startsWith("http:") && !currentUrl.startsWith("https:")) {
      throw new Error("Invalid URL protocol - only HTTP/HTTPS URLs are supported");
    }
    return currentUrl;
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

    const parts = this.currentProviderKey.split("-");
    const [type, embeddedWalletType] = parts;
    return {
      type: type as "injected" | "embedded",
      embeddedWalletType: embeddedWalletType as "app-wallet" | "user-wallet" | undefined,
    };
  }

  /**
   * Check if a provider is allowed by the config
   */
  private isProviderAllowed(provider: string): boolean {
    return this.config.providers.includes(provider as any);
  }

  /**
   * Connect using the current provider
   * Automatically switches provider based on authOptions.provider
   */
  async connect(authOptions: AuthOptions): Promise<ConnectResult> {
    debug.info(DebugCategory.PROVIDER_MANAGER, "Starting connection", {
      currentProviderKey: this.currentProviderKey,
      authOptions: { provider: authOptions.provider },
    });

    // Validate that the requested provider is allowed
    if (!this.isProviderAllowed(authOptions.provider)) {
      const error = `Provider "${authOptions.provider}" is not in the allowed providers list: ${JSON.stringify(this.config.providers)}`;
      debug.error(DebugCategory.PROVIDER_MANAGER, error);
      throw new Error(error);
    }

    // Auto-switch provider based on auth options
    const requestedProvider = authOptions.provider;

    // Determine target provider type
    let targetProviderType: "injected" | "embedded" | null = null;

    if (requestedProvider === "injected") {
      targetProviderType = "injected";
    } else if (requestedProvider === "deeplink") {
      // Handle deeplink - navigate to Phantom app
      try {
        const deeplinkUrl = getDeeplinkToPhantom();
        if (typeof window !== "undefined") {
          window.location.href = deeplinkUrl;
        }
        // Return a mock result since we're redirecting
        // The actual connection will happen when the user returns from the app
        return {
          addresses: [],
          walletId: undefined,
          authUserId: undefined,
        } as ConnectResult;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to open deeplink";
        debug.error(DebugCategory.PROVIDER_MANAGER, "Deeplink error", { error: errorMessage });
        throw new Error(`Failed to open deeplink: ${errorMessage}`);
      }
    } else if (EMBEDDED_PROVIDER_AUTH_TYPES.includes(requestedProvider as EmbeddedProviderAuthType)) {
      targetProviderType = "embedded";
    }

    // Switch provider if needed
    if (targetProviderType) {
      const currentInfo = this.getCurrentProviderInfo();
      if (currentInfo?.type !== targetProviderType) {
        debug.log(DebugCategory.PROVIDER_MANAGER, "Auto-switching provider based on auth options", {
          from: currentInfo?.type,
          to: targetProviderType,
          requestedProvider,
        });

        // Only pass embeddedWalletType when switching to embedded provider
        const switchOptions: SwitchProviderOptions = {};
        if (targetProviderType === "embedded") {
          switchOptions.embeddedWalletType =
            currentInfo?.embeddedWalletType ||
            (this.config.embeddedWalletType as "app-wallet" | "user-wallet" | undefined);
        }

        this.switchProvider(targetProviderType, switchOptions);
      }
    }

    if (!this.currentProvider) {
      debug.error(DebugCategory.PROVIDER_MANAGER, "No provider selected");
      throw new Error("No provider selected");
    }

    debug.log(DebugCategory.PROVIDER_MANAGER, "Delegating to provider connect method");
    const result = await this.currentProvider.connect(authOptions);

    debug.log(DebugCategory.PROVIDER_MANAGER, "Connection successful, saving preferences", {
      addressCount: result.addresses?.length || 0,
      provider: authOptions.provider,
    });

    // Save provider preference after successful connection
    this.saveProviderPreference();

    debug.info(DebugCategory.PROVIDER_MANAGER, "Connect completed", {
      addresses: result.addresses,
      provider: authOptions.provider,
    });
    return result;
  }

  /**
   * Disconnect from current provider
   */
  async disconnect(): Promise<void> {
    if (!this.currentProvider) return;

    await this.currentProvider.disconnect();
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
   * Attempt auto-connect with fallback strategy
   * Tries embedded provider first if it exists and is allowed, then injected provider if allowed
   * Returns true if any provider successfully connected
   */
  async autoConnect(): Promise<boolean> {
    debug.log(DebugCategory.PROVIDER_MANAGER, "Starting auto-connect with fallback strategy");

    // Check if we're in a callback URL with a failure response
    // If so, don't attempt fallback to another provider
    if (isAuthFailureCallback()) {
      debug.warn(DebugCategory.PROVIDER_MANAGER, "Auth failure detected in URL, skipping autoConnect fallback");
      return false;
    }

    const embeddedWalletType = (this.config.embeddedWalletType || "user-wallet") as "app-wallet" | "user-wallet";
    const embeddedKey = this.getProviderKey("embedded", embeddedWalletType);

    // Check if embedded providers are allowed
    const embeddedAllowed = this.config.providers.some(p => p !== "injected");

    // Try embedded provider first if it exists and is allowed
    if (embeddedAllowed && this.providers.has(embeddedKey)) {
      debug.log(DebugCategory.PROVIDER_MANAGER, "Trying auto-connect with existing embedded provider");
      const embeddedProvider = this.providers.get(embeddedKey)!;

      try {
        // Temporarily switch to embedded provider
        const previousProvider = this.currentProvider;
        const previousKey = this.currentProviderKey;
        this.currentProvider = embeddedProvider;
        this.currentProviderKey = embeddedKey;
        this.ensureProviderEventForwarding();

        await embeddedProvider.autoConnect();

        // Check if connection succeeded
        if (embeddedProvider.isConnected()) {
          debug.info(DebugCategory.PROVIDER_MANAGER, "Embedded auto-connect successful");
          this.saveProviderPreference();
          return true;
        } else {
          // Restore previous provider if not connected
          debug.log(DebugCategory.PROVIDER_MANAGER, "Embedded provider did not connect, restoring previous provider");
          this.currentProvider = previousProvider;
          this.currentProviderKey = previousKey;
        }
      } catch (error) {
        debug.log(DebugCategory.PROVIDER_MANAGER, "Embedded auto-connect failed", {
          error: (error as Error).message,
        });

        // If embedded auth failed and we're in a callback, don't try injected
        if (isAuthCallbackUrl()) {
          debug.log(DebugCategory.PROVIDER_MANAGER, "In auth callback URL, not attempting injected fallback");
          return false;
        }
      }
    }

    // Check if injected provider is allowed
    const injectedAllowed = this.config.providers.includes("injected");

    // Try injected provider if it's allowed and exists
    const injectedKey = this.getProviderKey("injected");

    if (injectedAllowed && this.providers.has(injectedKey)) {
      debug.log(DebugCategory.PROVIDER_MANAGER, "Trying auto-connect with existing injected provider");
      const injectedProvider = this.providers.get(injectedKey)!;

      try {
        // Switch to injected provider
        this.currentProvider = injectedProvider;
        this.currentProviderKey = injectedKey;
        this.ensureProviderEventForwarding();

        await injectedProvider.autoConnect();

        // Check if connection succeeded
        if (injectedProvider.isConnected()) {
          debug.info(DebugCategory.PROVIDER_MANAGER, "Injected auto-connect successful");
          this.saveProviderPreference();
          return true;
        }
      } catch (error) {
        debug.log(DebugCategory.PROVIDER_MANAGER, "Injected auto-connect failed", {
          error: (error as Error).message,
        });
      }
    }

    debug.log(DebugCategory.PROVIDER_MANAGER, "Auto-connect failed for all allowed providers");
    return false;
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
      data,
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
    if (!this.currentProvider || !("on" in this.currentProvider)) {
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
    const eventsToForward: EmbeddedProviderEvent[] = [
      "connect_start",
      "connect",
      "connect_error",
      "disconnect",
      "error",
      "spending_limit_reached",
    ];

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
   * Creates providers based on the allowed providers array
   */
  private setDefaultProvider(): void {
    const defaultEmbeddedType = (this.config.embeddedWalletType || "user-wallet") as "app-wallet" | "user-wallet";

    const hasInjected = this.config.providers.includes("injected");
    const hasEmbedded = this.config.providers.some(p => p !== "injected" && p !== "deeplink");

    // Create injected provider if allowed
    if (hasInjected) {
      debug.log(DebugCategory.PROVIDER_MANAGER, "Creating injected provider (allowed by providers array)");
      this.createProvider("injected");
    }

    // Create embedded provider if any embedded auth types are allowed
    if (hasEmbedded) {
      debug.log(DebugCategory.PROVIDER_MANAGER, "Creating embedded provider (allowed by providers array)");
      this.createProvider("embedded", defaultEmbeddedType);
    }

    // Set default provider - prefer embedded if available, otherwise injected
    let defaultType: "injected" | "embedded";
    if (hasEmbedded && this.providers.has(`embedded-${defaultEmbeddedType}`)) {
      defaultType = "embedded";
    } else if (hasInjected && this.providers.has("injected")) {
      defaultType = "injected";
    } else {
      throw new Error("No valid providers could be created from the providers array");
    }

    const switchOptions: SwitchProviderOptions = {};
    if (defaultType === "embedded") {
      switchOptions.embeddedWalletType = defaultEmbeddedType;
    }
    this.switchProvider(defaultType, switchOptions);
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
        addressTypes: this.config.addressTypes || [AddressType.solana],
      });
    } else if (type === "embedded") {
      if (!this.config.appId) {
        throw new Error("appId is required for embedded provider");
      }

      const apiBaseUrl = this.config.apiBaseUrl || DEFAULT_WALLET_API_URL;
      const authUrl = this.config.authOptions?.authUrl || DEFAULT_AUTH_URL;

      provider = new EmbeddedProvider({
        apiBaseUrl,
        appId: this.config.appId,
        authOptions: {
          ...(this.config.authOptions || {}),
          authUrl,
          redirectUrl: this.config.authOptions?.redirectUrl || this.getValidatedCurrentUrl(),
        },
        embeddedWalletType: embeddedWalletType || DEFAULT_EMBEDDED_WALLET_TYPE,
        addressTypes: this.config.addressTypes || [AddressType.solana],
      });
    } else {
      throw new Error(`Unsupported provider type: ${type}`);
    }

    this.providers.set(key, provider);
  }

  /**
   * Generate a unique key for provider instances
   */
  private getProviderKey(type: "injected" | "embedded", embeddedWalletType?: "app-wallet" | "user-wallet"): string {
    if (type === "injected") {
      return "injected";
    } else if (type === "embedded") {
      return `embedded-${embeddedWalletType || "app-wallet"}`;
    }
    throw new Error(`Unsupported provider type: ${type}`);
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
}
