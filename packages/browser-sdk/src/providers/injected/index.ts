import type {
  Provider,
  ConnectResult,
  WalletAddress,
  AuthOptions,
} from "../../types";
import type { EmbeddedProviderEvent, EventCallback } from "@phantom/embedded-provider-core";
import { AddressType } from "@phantom/client";
import { isPhantomExtensionInstalled } from "@phantom/browser-injected-sdk";
import { debug, DebugCategory } from "../../debug";
import { InjectedSolanaChain, InjectedEthereumChain } from "./chains";
import type { ISolanaChain, IEthereumChain } from "@phantom/chains";

declare global {
  interface Window {
    phantom?: {
      solana?: any;
      ethereum?: any;
    };
  }
}

interface InjectedProviderConfig {
  solanaProvider: "web3js" | "kit";
  addressTypes: [AddressType, ...AddressType[]];
}

export class InjectedProvider implements Provider {
  private connected: boolean = false;
  private addresses: WalletAddress[] = [];
  private addressTypes: [AddressType, ...AddressType[]];
  
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
    debug.info(DebugCategory.INJECTED_PROVIDER, "InjectedProvider initialized");
  }

  /**
   * Access to Solana chain operations
   */
  get solana(): ISolanaChain {
    if (!this.addressTypes.includes(AddressType.solana)) {
      throw new Error('Solana not enabled for this provider');
    }
    if (!this._solanaChain) {
      this._solanaChain = new InjectedSolanaChain();
    }
    return this._solanaChain;
  }

  /**
   * Access to Ethereum chain operations
   */
  get ethereum(): IEthereumChain {
    if (!this.addressTypes.includes(AddressType.ethereum)) {
      throw new Error('Ethereum not enabled for this provider');
    }
    if (!this._ethereumChain) {
      this._ethereumChain = new InjectedEthereumChain();
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
      if (!isPhantomExtensionInstalled()) {
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
          const result = await this.solana.connect();
          if (result.publicKey) {
            connectedAddresses.push({
              addressType: AddressType.solana,
              address: result.publicKey,
            });
            debug.info(DebugCategory.INJECTED_PROVIDER, "Solana connected successfully", { address: result.publicKey });
          }
        } catch (err) {
          // Continue to other address types
          debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to connect Solana", { error: err });
        }
      }

      // Try Ethereum if enabled
      if (this.addressTypes.includes(AddressType.ethereum)) {
        try {
          const accounts = await this.ethereum.getAccounts();
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
      if (error instanceof Error && !error.message.includes("Phantom wallet not found") && !error.message.includes("Failed to connect to any supported wallet provider")) {
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
        await this.solana.disconnect();
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

    // Reset chain instances on disconnect
    this._solanaChain = undefined;
    this._ethereumChain = undefined;

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
      data 
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
    if (this.addressTypes.includes(AddressType.solana) && window.phantom?.solana) {
      this.setupSolanaEvents();
    }

    // Set up Ethereum events if enabled  
    if (this.addressTypes.includes(AddressType.ethereum) && window.phantom?.ethereum) {
      this.setupEthereumEvents();
    }
  }

  private setupSolanaEvents(): void {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up Solana event listeners");

    const solanaProvider = window.phantom?.solana;
    if (!solanaProvider) return;

    // Map Solana connect event to unified connect event
    const handleSolanaConnect = (publicKey: any) => {
      const address = publicKey?.toString?.() || publicKey;
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana connect event received", { publicKey: address });
      
      // Update our internal state
      const solanaAddress = { addressType: AddressType.solana, address };
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
    const handleSolanaAccountChanged = (publicKey: any) => {
      const address = publicKey?.toString?.() || publicKey;
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana account changed event received", { publicKey: address });
      
      // Update the Solana address
      const solanaIndex = this.addresses.findIndex(addr => addr.addressType === AddressType.solana);
      if (solanaIndex >= 0) {
        this.addresses[solanaIndex] = { addressType: AddressType.solana, address };
      } else {
        this.addresses.push({ addressType: AddressType.solana, address });
      }
      
      // Emit as a new connect event (account change = reconnection)
      this.emit("connect", {
        addresses: this.addresses,
        source: "injected-extension-account-change",
      });
    };

    // Add event listeners
    solanaProvider.on("connect", handleSolanaConnect);
    solanaProvider.on("disconnect", handleSolanaDisconnect);
    solanaProvider.on("accountChanged", handleSolanaAccountChanged);

    // Store cleanup functions
    this.browserInjectedCleanupFunctions.push(
      () => solanaProvider.off("connect", handleSolanaConnect),
      () => solanaProvider.off("disconnect", handleSolanaDisconnect),
      () => solanaProvider.off("accountChanged", handleSolanaAccountChanged)
    );
  }

  private setupEthereumEvents(): void {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up Ethereum event listeners");

    const ethereumProvider = window.phantom?.ethereum;
    if (!ethereumProvider) return;

    // Map Ethereum connect event to unified connect event
    const handleEthereumConnect = (connectInfo: { chainId: string }) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum connect event received", { connectInfo });
      
      // For Ethereum connect, we need to fetch accounts
      this.ethereum.getAccounts().then(accounts => {
        // Update our internal state - remove old Ethereum addresses and add new ones
        this.addresses = this.addresses.filter(addr => addr.addressType !== AddressType.ethereum);
        if (accounts && accounts.length > 0) {
          this.addresses.push(...accounts.map(address => ({ 
            addressType: AddressType.ethereum, 
            address 
          })));
        }
        this.connected = this.addresses.length > 0;
        
        // Emit unified connect event
        this.emit("connect", {
          addresses: this.addresses,
          source: "injected-extension",
        });
      }).catch(err => {
        debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to get accounts on connect", { error: err });
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

    // Map Ethereum account changed to reconnect event
    const handleEthereumAccountsChanged = (accounts: string[]) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum accounts changed event received", { accounts });
      
      // Update Ethereum addresses
      this.addresses = this.addresses.filter(addr => addr.addressType !== AddressType.ethereum);
      if (accounts && accounts.length > 0) {
        this.addresses.push(...accounts.map(address => ({ 
          addressType: AddressType.ethereum, 
          address 
        })));
      }
      
      // Emit as a new connect event (account change = reconnection)
      this.emit("connect", {
        addresses: this.addresses,
        source: "injected-extension-account-change",
      });
    };

    // Add event listeners
    ethereumProvider.on("connect", handleEthereumConnect);
    ethereumProvider.on("disconnect", handleEthereumDisconnect);
    ethereumProvider.on("accountsChanged", handleEthereumAccountsChanged);

    // Store cleanup functions
    this.browserInjectedCleanupFunctions.push(
      () => ethereumProvider.removeListener("connect", handleEthereumConnect),
      () => ethereumProvider.removeListener("disconnect", handleEthereumDisconnect),
      () => ethereumProvider.removeListener("accountsChanged", handleEthereumAccountsChanged)
    );
  }
}
