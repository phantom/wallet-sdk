import type { Provider, ConnectResult, WalletAddress, AuthOptions } from "../../types";
import type { EmbeddedProviderEvent, EventCallback } from "@phantom/embedded-provider-core";
import { AddressType } from "@phantom/client";
import { createPhantom, createExtensionPlugin, type Extension, type Plugin } from "@phantom/browser-injected-sdk";
import { createSolanaPlugin, type Solana } from "@phantom/browser-injected-sdk/solana";
import { createEthereumPlugin, type Ethereum } from "@phantom/browser-injected-sdk/ethereum";
import {
  createAutoConfirmPlugin,
  type AutoConfirmPlugin,
  type AutoConfirmEnableParams,
  type AutoConfirmResult,
  type AutoConfirmSupportedChainsResult,
} from "@phantom/browser-injected-sdk/auto-confirm";

// Define proper interface with imported types from browser-injected-sdk
interface PhantomExtended {
  extension: Extension;
  solana: Solana;
  ethereum: Ethereum;
  autoConfirm: AutoConfirmPlugin;
}


/**
 * Phantom extension app.login API types
 */
interface PhantomAppLoginOptions {
  publicKey: string;
  appId: string;
  sessionId: string;
}

interface PhantomAppLoginResult {
  walletId: string;
  organizationId: string;
  accountDerivationIndex?: number;
  expiresInMs?: number;
  authUserId?: string;
}

interface PhantomApp {
  login(options: PhantomAppLoginOptions): Promise<PhantomAppLoginResult>;
  features(): Promise<{features: string[]}>;
  getUser(): Promise<{ authUserId?: string } | undefined>;
}

declare global {
  interface Window {
    phantom?: {
      solana?: unknown;
      ethereum?: unknown;
      app?: PhantomApp;
    } | undefined;
  }
}

import { debug, DebugCategory } from "../../debug";
import { InjectedSolanaChain, InjectedEthereumChain, type ChainCallbacks } from "./chains";
import type { ISolanaChain, IEthereumChain } from "@phantom/chain-interfaces";

// LocalStorage key and value for tracking manual disconnect to prevent auto-reconnect
const MANUAL_DISCONNECT_KEY = "phantom-injected-manual-disconnect";
const MANUAL_DISCONNECT_VALUE = "true";

export interface InjectedProviderConfig {
  addressTypes: AddressType[];
}

export class InjectedProvider implements Provider {
  private connected: boolean = false;
  private addresses: WalletAddress[] = [];
  private addressTypes: AddressType[];
  private phantom: PhantomExtended;

  // Chain instances
  private _solanaChain?: ISolanaChain;
  private _ethereumChain?: IEthereumChain;

  // Event management
  private eventListeners: Map<EmbeddedProviderEvent, Set<EventCallback>> = new Map();
  private browserInjectedCleanupFunctions: (() => void)[] = [];
  private eventsInitialized: boolean = false;

  constructor(config: InjectedProviderConfig) {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Initializing InjectedProvider", { config });

    // Store config values
    this.addressTypes = config.addressTypes;
    debug.log(DebugCategory.INJECTED_PROVIDER, "Address types configured", { addressTypes: this.addressTypes });

    // Create single phantom instance with all needed plugins
    const plugins: Plugin<any>[] = [createExtensionPlugin()];

    if (this.addressTypes.includes(AddressType.solana)) {
      plugins.push(createSolanaPlugin());
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana plugin added");
    }

    if (this.addressTypes.includes(AddressType.ethereum)) {
      plugins.push(createEthereumPlugin());
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum plugin added");
    }

    // Always add autoConfirm for injected providers
    plugins.push(createAutoConfirmPlugin());
    debug.log(DebugCategory.INJECTED_PROVIDER, "AutoConfirm plugin added");

    debug.log(DebugCategory.INJECTED_PROVIDER, "Creating Phantom instance with plugins", {
      pluginCount: plugins.length,
    });
    this.phantom = createPhantom({ plugins }) as unknown as PhantomExtended;

    // Create callback objects to avoid circular dependencies
    const callbacks = this.createCallbacks();

    // Create chains with callbacks instead of SDK reference
    if (this.addressTypes.includes(AddressType.solana)) {
      this._solanaChain = new InjectedSolanaChain(this.phantom, callbacks);
    }
    if (this.addressTypes.includes(AddressType.ethereum)) {
      this._ethereumChain = new InjectedEthereumChain(this.phantom, callbacks);
    }

    debug.info(DebugCategory.INJECTED_PROVIDER, "InjectedProvider initialized");
  }

  /**
   * Access to Solana chain operations
   */
  get solana(): ISolanaChain {
    if (!this.addressTypes.includes(AddressType.solana)) {
      throw new Error("Solana not enabled for this provider");
    }
    if (!this._solanaChain) {
      throw new Error("Solana chain not initialized");
    }
    return this._solanaChain;
  }

  /**
   * Access to Ethereum chain operations
   */
  get ethereum(): IEthereumChain {
    if (!this.addressTypes.includes(AddressType.ethereum)) {
      throw new Error("Ethereum not enabled for this provider");
    }
    if (!this._ethereumChain) {
      throw new Error("Ethereum chain not initialized");
    }
    return this._ethereumChain;
  }

  async connect(authOptions: AuthOptions): Promise<ConnectResult> {
    debug.info(DebugCategory.INJECTED_PROVIDER, "Starting injected provider connect", {
      addressTypes: this.addressTypes,
      provider: authOptions.provider,
    });

    // Validate provider is "injected"
    if (authOptions.provider !== "injected") {
      throw new Error(`Invalid provider for injected connection: ${authOptions.provider}. Must be "injected"`);
    }

    // Emit connect_start event for manual connect
    this.emit("connect_start", {
      source: "manual-connect",
      providerType: "injected",
    });

    try {
      if (!this.phantom.extension?.isInstalled?.()) {
        debug.error(DebugCategory.INJECTED_PROVIDER, "Phantom wallet extension not found");
        const error = new Error("Phantom wallet not found");

        // Emit connect_error event before throwing
        this.emit("connect_error", {
          error: error.message,
          source: "manual-connect",
        });

        throw error;
      }
      debug.log(DebugCategory.INJECTED_PROVIDER, "Phantom extension detected");

      const connectedAddresses: WalletAddress[] = [];

      // Try Solana if enabled
      if (this.addressTypes.includes(AddressType.solana)) {
        debug.log(DebugCategory.INJECTED_PROVIDER, "Attempting Solana connection");
        try {
          const publicKey = await this.phantom.solana.connect();
          if (publicKey) {
            connectedAddresses.push({
              addressType: AddressType.solana,
              address: publicKey,
            });
            debug.info(DebugCategory.INJECTED_PROVIDER, "Solana connected successfully", { address: publicKey });
          }
        } catch (err) {
          // Stop immediately on any error - don't try other chains
          debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to connect Solana, stopping", { error: err });

          // Emit connect_error event before throwing
          this.emit("connect_error", {
            error: err instanceof Error ? err.message : "Failed to connect",
            source: "manual-connect",
          });

          throw err;
        }
      }

      // Try Ethereum if enabled
      if (this.addressTypes.includes(AddressType.ethereum)) {
        try {
          const accounts = await this.phantom.ethereum.connect();
          if (accounts && accounts.length > 0) {
            connectedAddresses.push(
              ...accounts.map((address: string) => ({
                addressType: AddressType.ethereum,
                address,
              })),
            );
            debug.info(DebugCategory.INJECTED_PROVIDER, "Ethereum connected successfully", { addresses: accounts });
          }
        } catch (err) {
          // Stop immediately on any error
          debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to connect Ethereum, stopping", { error: err });

          // Emit connect_error event before throwing
          this.emit("connect_error", {
            error: err instanceof Error ? err.message : "Failed to connect",
            source: "manual-connect",
          });

          throw err;
        }
      }

      if (connectedAddresses.length === 0) {
        const error = new Error("Failed to connect to any supported wallet provider");

        // Emit connect_error event before throwing
        this.emit("connect_error", {
          error: error.message,
          source: "manual-connect",
        });

        throw error;
      }

      this.addresses = connectedAddresses;
      this.connected = true;

      // Get authUserId if available
      const authUserId = await this.getAuthUserId("manual-connect");
      // Clear manual disconnect flag since user is now explicitly connecting
      // This allows auto-reconnect on future page reloads
      try {
        localStorage.removeItem(MANUAL_DISCONNECT_KEY);
        debug.log(DebugCategory.INJECTED_PROVIDER, "Cleared manual disconnect flag - auto-reconnect enabled");
      } catch (error) {
        // Ignore localStorage errors (e.g., in private browsing mode)
        debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to clear manual disconnect flag", { error });
      }

      const result = {
        addresses: this.addresses,
        status: "completed" as const,
        authUserId,
      };

      // Emit connect event for successful connection
      this.emit("connect", {
        addresses: this.addresses,
        source: "manual-connect",
        authUserId,
      });

      return result;
    } catch (error) {
      // If we haven't already emitted connect_error, emit it now
      if (
        error instanceof Error &&
        !error.message.includes("Phantom wallet not found") &&
        !error.message.includes("Failed to connect to any supported wallet provider")
      ) {
        this.emit("connect_error", {
          error: error.message,
          source: "manual-connect",
        });
      }

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    debug.info(DebugCategory.INJECTED_PROVIDER, "Starting injected provider disconnect");

    // Disconnect from Solana if enabled
    if (this.addressTypes.includes(AddressType.solana)) {
      try {
        await this.phantom.solana.disconnect();
        debug.log(DebugCategory.INJECTED_PROVIDER, "Solana disconnected successfully");
      } catch (err) {
        // Ignore errors if Solana wasn't connected
        debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to disconnect Solana", { error: err });
      }
    }

    // Disconnect from Ethereum if enabled (no-op for Ethereum - it doesn't have a disconnect method)
    if (this.addressTypes.includes(AddressType.ethereum)) {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum disconnected (no-op)");
    }

    // Don't reset chain instances - they should remain available after disconnect

    // Clean up browser-injected-sdk event listeners only
    // Do NOT clear this.eventListeners as it contains ProviderManager forwarding callbacks
    this.browserInjectedCleanupFunctions.forEach(cleanup => cleanup());
    this.browserInjectedCleanupFunctions = [];

    this.connected = false;
    this.addresses = [];

    // Set flag to prevent auto-reconnect on page reload
    // This improves UX by respecting the user's explicit disconnect action
    try {
      localStorage.setItem(MANUAL_DISCONNECT_KEY, MANUAL_DISCONNECT_VALUE);
      debug.log(DebugCategory.INJECTED_PROVIDER, "Set manual disconnect flag to prevent auto-reconnect");
    } catch (error) {
      // Ignore localStorage errors (e.g., in private browsing mode)
      debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to set manual disconnect flag", { error });
    }

    // Emit disconnect event
    this.emit("disconnect", {
      source: "manual-disconnect",
    });

    debug.info(DebugCategory.INJECTED_PROVIDER, "Injected provider disconnected successfully");
  }

  
  /**
   * Attempt auto-connection using onlyIfTrusted parameter
   * This will only connect if the dApp is already trusted by the user
   * Should be called after setting up event listeners
   */
  async autoConnect(): Promise<void> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Attempting auto-connect with onlyIfTrusted=true");

    // Check if user manually disconnected - if so, respect their choice and don't auto-reconnect
    try {
      const manualDisconnect = localStorage.getItem(MANUAL_DISCONNECT_KEY);
      if (manualDisconnect === MANUAL_DISCONNECT_VALUE) {
        debug.log(DebugCategory.INJECTED_PROVIDER, "Skipping auto-connect: user previously disconnected manually");
        return; // Don't auto-connect if user explicitly disconnected
      }
    } catch (error) {
      // Ignore localStorage errors (e.g., in private browsing mode)
      debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to check manual disconnect flag", { error });
    }

    // Emit connect_start event for auto-connect
    this.emit("connect_start", {
      source: "auto-connect",
      providerType: "injected",
    });

    try {
      if (!this.phantom.extension?.isInstalled?.()) {
        debug.warn(DebugCategory.INJECTED_PROVIDER, "Phantom wallet extension not found for auto-connect");

        // Emit connect_error event for auto-connect failure
        this.emit("connect_error", {
          error: "Phantom wallet not found",
          source: "auto-connect",
        });

        return; // Silently fail for auto-connect
      }

      const connectedAddresses: WalletAddress[] = [];

      // Try Solana auto-connect if enabled
      if (this.addressTypes.includes(AddressType.solana)) {
        debug.log(DebugCategory.INJECTED_PROVIDER, "Attempting Solana auto-connect");
        try {
          // Use onlyIfTrusted=true for silent connection
          const publicKey = await this.phantom.solana.connect({ onlyIfTrusted: true });
          if (publicKey) {
            connectedAddresses.push({
              addressType: AddressType.solana,
              address: publicKey,
            });
            debug.info(DebugCategory.INJECTED_PROVIDER, "Solana auto-connected successfully", { address: publicKey });
          }
        } catch (err) {
          // Silently fail for auto-connect
          debug.log(DebugCategory.INJECTED_PROVIDER, "Solana auto-connect failed (expected if not trusted)", { error: err });
        }
      }

      // Try Ethereum auto-connect if enabled
      if (this.addressTypes.includes(AddressType.ethereum)) {
        debug.log(DebugCategory.INJECTED_PROVIDER, "Attempting Ethereum auto-connect");
        try {
          // Use onlyIfTrusted=true for silent connection
          const accounts = await this.phantom.ethereum.connect({ onlyIfTrusted: true });
          if (accounts && accounts.length > 0) {
            connectedAddresses.push(
              ...accounts.map((address: string) => ({
                addressType: AddressType.ethereum,
                address,
              })),
            );
            debug.info(DebugCategory.INJECTED_PROVIDER, "Ethereum auto-connected successfully", { addresses: accounts });
          }
        } catch (err) {
          // Silently fail for auto-connect
          debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum auto-connect failed (expected if not trusted)", { error: err });
        }
      }

      if (connectedAddresses.length === 0) {
        debug.log(DebugCategory.INJECTED_PROVIDER, "Auto-connect failed: no trusted connections available");

        // Emit connect_error for auto-connect failure
        this.emit("connect_error", {
          error: "No trusted connections available",
          source: "auto-connect",
        });

        return; // Silently fail for auto-connect
      }

      // Success! Update state
      this.addresses = connectedAddresses;
      this.connected = true;

      // Get authUserId if available
      const authUserId = await this.getAuthUserId("auto-connect");

      // Event handling is initialized in constructor

      // Emit connect event for successful auto-connection
      this.emit("connect", {
        addresses: this.addresses,
        source: "auto-connect",
        authUserId,
      });

      debug.info(DebugCategory.INJECTED_PROVIDER, "Auto-connect successful", {
        addressCount: connectedAddresses.length,
        addresses: connectedAddresses.map(addr => ({ type: addr.addressType, address: addr.address.substring(0, 8) + "..." })),
        authUserId,
      });

    } catch (error) {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Auto-connect failed with error", {
        error: error instanceof Error ? error.message : String(error),
      });

      // Emit connect_error for auto-connect failure
      this.emit("connect_error", {
        error: error instanceof Error ? error.message : "Auto-connect failed",
        source: "auto-connect",
      });

      // Silently fail for auto-connect (don't throw)
    }
  }

  getAddresses(): WalletAddress[] {
    return this.addresses;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // AutoConfirm methods - only available for injected providers
  async enableAutoConfirm(params: AutoConfirmEnableParams): Promise<AutoConfirmResult> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Enabling autoConfirm", { params });
    return await this.phantom.autoConfirm.autoConfirmEnable(params);
  }

  async disableAutoConfirm(): Promise<void> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Disabling autoConfirm");
    await this.phantom.autoConfirm.autoConfirmDisable();
  }

  async getAutoConfirmStatus(): Promise<AutoConfirmResult> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Getting autoConfirm status");
    return await this.phantom.autoConfirm.autoConfirmStatus();
  }

  async getSupportedAutoConfirmChains(): Promise<AutoConfirmSupportedChainsResult> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Getting supported autoConfirm chains");
    return await this.phantom.autoConfirm.autoConfirmSupportedChains();
  }

  /**
   * Helper method to get authUserId from window.phantom.app.getUser()
   * Returns undefined if the method is not available or fails
   */
  private async getAuthUserId(context: string): Promise<string | undefined> {
    try {
      if (window.phantom?.app?.getUser) {
        const userInfo = await window.phantom.app.getUser();
        const authUserId = userInfo?.authUserId;
        if (authUserId) {
          debug.log(DebugCategory.INJECTED_PROVIDER, `Retrieved authUserId from window.phantom.app.getUser() during ${context}`, {
            authUserId,
          });
        }
        return authUserId;
      }
    } catch (error) {
      // Silently ignore errors - getUser() might not be supported in all extension versions
      debug.log(DebugCategory.INJECTED_PROVIDER, `Failed to get user info during ${context} (method may not be supported)`, { error });
    }
    return undefined;
  }

  // Event management methods - implementing unified event interface
  on(event: EmbeddedProviderEvent, callback: EventCallback): void {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Adding event listener", { event });

    // Lazy-initialize browser-injected-sdk events when first listener is added
    if (!this.eventsInitialized) {
      this.setupBrowserInjectedEvents();
      this.eventsInitialized = true;
    }

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  off(event: EmbeddedProviderEvent, callback: EventCallback): void {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Removing event listener", { event });

    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.delete(callback);
      if (this.eventListeners.get(event)!.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  private emit(event: EmbeddedProviderEvent, data?: any): void {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Emitting event", {
      event,
      listenerCount: this.eventListeners.get(event)?.size || 0,
      data,
    });

    const listeners = this.eventListeners.get(event);
    if (listeners && listeners.size > 0) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          debug.error(DebugCategory.INJECTED_PROVIDER, "Event callback error", { event, error });
        }
      });
    }
  }

  private setupBrowserInjectedEvents(): void {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up browser-injected-sdk event listeners");

    // Set up Solana events if enabled
    if (this.addressTypes.includes(AddressType.solana)) {
      this.setupSolanaEvents();
    }

    // Set up Ethereum events if enabled
    if (this.addressTypes.includes(AddressType.ethereum)) {
      this.setupEthereumEvents();
    }
  }

  private setupSolanaEvents(): void {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up Solana event listeners");

    // Map Solana connect event to unified connect event
    const handleSolanaConnect = async (publicKey: string) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana connect event received", { publicKey });

      // Update our internal state
      const solanaAddress = { addressType: AddressType.solana, address: publicKey };
      if (!this.addresses.find(addr => addr.addressType === AddressType.solana)) {
        this.addresses.push(solanaAddress);
      }
      this.connected = true;

      // Get authUserId if available
      const authUserId = await this.getAuthUserId("Solana connect event");

      // Emit unified connect event
      this.emit("connect", {
        addresses: this.addresses,
        source: "injected-extension",
        authUserId,
      });
    };

    // Map Solana disconnect event to unified disconnect event
    const handleSolanaDisconnect = () => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana disconnect event received");

      // Update our internal state
      this.addresses = this.addresses.filter(addr => addr.addressType !== AddressType.solana);
      this.connected = false; // Disconnect event means the user disconnected the dApp

      // Emit unified disconnect event
      this.emit("disconnect", {
        source: "injected-extension",
      });
    };

    // Map Solana account changed to reconnect event
    const handleSolanaAccountChanged = async (publicKey: string) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana account changed event received", { publicKey });

      // Update the Solana address
      const solanaIndex = this.addresses.findIndex(addr => addr.addressType === AddressType.solana);
      if (solanaIndex >= 0) {
        this.addresses[solanaIndex] = { addressType: AddressType.solana, address: publicKey };
      } else {
        this.addresses.push({ addressType: AddressType.solana, address: publicKey });
      }

      // Get authUserId if available
      const authUserId = await this.getAuthUserId("Solana account changed event");

      // Emit as a new connect event (account change = reconnection)
      this.emit("connect", {
        addresses: this.addresses,
        source: "injected-extension-account-change",
        authUserId,
      });
    };

    // Add event listeners using browser-injected-sdk
    const cleanupConnect = this.phantom.solana.addEventListener("connect", handleSolanaConnect);
    const cleanupDisconnect = this.phantom.solana.addEventListener("disconnect", handleSolanaDisconnect);
    const cleanupAccountChanged = this.phantom.solana.addEventListener("accountChanged", handleSolanaAccountChanged);

    // Store cleanup functions
    this.browserInjectedCleanupFunctions.push(cleanupConnect, cleanupDisconnect, cleanupAccountChanged);
  }

  private setupEthereumEvents(): void {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up Ethereum event listeners");

    // Map Ethereum connect event to unified connect event
    const handleEthereumConnect = async (accounts: string[]) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum connect event received", { accounts });

      // Update our internal state - remove old Ethereum addresses and add new ones
      this.addresses = this.addresses.filter(addr => addr.addressType !== AddressType.ethereum);
      if (accounts && accounts.length > 0) {
        this.addresses.push(
          ...accounts.map(address => ({
            addressType: AddressType.ethereum,
            address,
          })),
        );
      }
      this.connected = this.addresses.length > 0;

      // Get authUserId if available
      const authUserId = await this.getAuthUserId("Ethereum connect event");

      // Emit unified connect event
      this.emit("connect", {
        addresses: this.addresses,
        source: "injected-extension",
        authUserId,
      });
    };

    // Map Ethereum disconnect event to unified disconnect event
    const handleEthereumDisconnect = () => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum disconnect event received");

      // Update our internal state
      this.addresses = this.addresses.filter(addr => addr.addressType !== AddressType.ethereum);
      this.connected = false; // Disconnect event means the user disconnected the dApp

      // Emit unified disconnect event
      this.emit("disconnect", {
        source: "injected-extension",
      });
    };

    // Map Ethereum account changed to reconnect event or disconnect
    const handleEthereumAccountsChanged = async (accounts: string[]) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum accounts changed event received", { accounts });

      // Update Ethereum addresses
      this.addresses = this.addresses.filter(addr => addr.addressType !== AddressType.ethereum);

      if (accounts && accounts.length > 0) {
        // User switched to a connected account - add new addresses
        this.addresses.push(
          ...accounts.map(address => ({
            addressType: AddressType.ethereum,
            address,
          })),
        );

        // Get authUserId if available
        const authUserId = await this.getAuthUserId("Ethereum accounts changed event");

        // Emit as a new connect event (account change = reconnection)
        this.emit("connect", {
          addresses: this.addresses,
          source: "injected-extension-account-change",
          authUserId,
        });
      } else {
        // User switched to unconnected account - treat as disconnect
        this.connected = false;

        this.emit("disconnect", {
          source: "injected-extension-account-change",
        });
      }
    };

    // Add event listeners using browser-injected-sdk
    const cleanupConnect = this.phantom.ethereum.addEventListener("connect", handleEthereumConnect);
    const cleanupDisconnect = this.phantom.ethereum.addEventListener("disconnect", handleEthereumDisconnect);
    const cleanupAccountsChanged = this.phantom.ethereum.addEventListener(
      "accountsChanged",
      handleEthereumAccountsChanged,
    );

    // Store cleanup functions
    this.browserInjectedCleanupFunctions.push(cleanupConnect, cleanupDisconnect, cleanupAccountsChanged);
  }

  private createCallbacks(): ChainCallbacks {
    return {
      connect: async (): Promise<WalletAddress[]> => {
        const result = await this.connect({ provider: "injected" });
        return result.addresses;
      },
      disconnect: async (): Promise<void> => {
        await this.disconnect();
      },
      isConnected: (): boolean => {
        return this.isConnected();
      },
      getAddresses: (): WalletAddress[] => {
        return this.getAddresses();
      },
      on: (event: string, callback: (data: any) => void): void => {
        this.on(event as any, callback);
      },
      off: (event: string, callback: (data: any) => void): void => {
        this.off(event as any, callback);
      },
    };
  }
}
