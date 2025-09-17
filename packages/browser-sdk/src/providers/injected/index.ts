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
import { debug, DebugCategory } from "../../debug";
import { InjectedSolanaChain, InjectedEthereumChain, type ChainCallbacks } from "./chains";
import type { ISolanaChain, IEthereumChain } from "@phantom/chain-interfaces";

declare global {
  interface Window {
    phantom?: {
      solana?: unknown;
      ethereum?: unknown;
    };
  }
}

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

  async connect(authOptions?: AuthOptions): Promise<ConnectResult> {
    debug.info(DebugCategory.INJECTED_PROVIDER, "Starting injected provider connect", {
      addressTypes: this.addressTypes,
      authOptionsIgnored: !!authOptions, // Note: authOptions are ignored for injected provider
    });

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
          // Continue to other address types
          debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to connect Solana", { error: err });
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
          // Continue to other address types
          debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to connect Ethereum", { error: err });
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

      const result = {
        addresses: this.addresses,
        status: "completed" as const,
        // walletId is not applicable for injected providers
      };

      // Emit connect event for successful connection
      this.emit("connect", {
        addresses: this.addresses,
        source: "manual-connect",
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

    // Emit disconnect event
    this.emit("disconnect", {
      source: "manual-disconnect",
    });

    debug.info(DebugCategory.INJECTED_PROVIDER, "Injected provider disconnected successfully");
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
    const handleSolanaConnect = (publicKey: string) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana connect event received", { publicKey });

      // Update our internal state
      const solanaAddress = { addressType: AddressType.solana, address: publicKey };
      if (!this.addresses.find(addr => addr.addressType === AddressType.solana)) {
        this.addresses.push(solanaAddress);
      }
      this.connected = true;

      // Emit unified connect event
      this.emit("connect", {
        addresses: this.addresses,
        source: "injected-extension",
      });
    };

    // Map Solana disconnect event to unified disconnect event
    const handleSolanaDisconnect = () => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana disconnect event received");

      // Update our internal state
      this.addresses = this.addresses.filter(addr => addr.addressType !== AddressType.solana);
      this.connected = this.addresses.length > 0;

      // Emit unified disconnect event
      this.emit("disconnect", {
        source: "injected-extension",
      });
    };

    // Map Solana account changed to reconnect event
    const handleSolanaAccountChanged = (publicKey: string) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana account changed event received", { publicKey });

      // Update the Solana address
      const solanaIndex = this.addresses.findIndex(addr => addr.addressType === AddressType.solana);
      if (solanaIndex >= 0) {
        this.addresses[solanaIndex] = { addressType: AddressType.solana, address: publicKey };
      } else {
        this.addresses.push({ addressType: AddressType.solana, address: publicKey });
      }

      // Emit as a new connect event (account change = reconnection)
      this.emit("connect", {
        addresses: this.addresses,
        source: "injected-extension-account-change",
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
    const handleEthereumConnect = (accounts: string[]) => {
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

      // Emit unified connect event
      this.emit("connect", {
        addresses: this.addresses,
        source: "injected-extension",
      });
    };

    // Map Ethereum disconnect event to unified disconnect event
    const handleEthereumDisconnect = () => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum disconnect event received");

      // Update our internal state
      this.addresses = this.addresses.filter(addr => addr.addressType !== AddressType.ethereum);
      this.connected = this.addresses.length > 0;

      // Emit unified disconnect event
      this.emit("disconnect", {
        source: "injected-extension",
      });
    };

    // Map Ethereum account changed to reconnect event or disconnect
    const handleEthereumAccountsChanged = (accounts: string[]) => {
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

        // Emit as a new connect event (account change = reconnection)
        this.emit("connect", {
          addresses: this.addresses,
          source: "injected-extension-account-change",
        });
      } else {
        // User switched to unconnected account - treat as disconnect
        this.connected = this.addresses.length > 0;

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
        const result = await this.connect();
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
