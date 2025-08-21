import type {
  Provider,
  ConnectResult,
  SignMessageParams,
  SignAndSendTransactionParams,
  SignMessageResult,
  SignedTransaction,
  WalletAddress,
  AuthOptions,
} from "../../types";
import type { EmbeddedProviderEvent, EventCallback } from "@phantom/embedded-provider-core";
import { AddressType } from "@phantom/client";
import { createPhantom, createExtensionPlugin } from "@phantom/browser-injected-sdk";
import { createSolanaPlugin } from "@phantom/browser-injected-sdk/solana";
import { createEthereumPlugin } from "@phantom/browser-injected-sdk/ethereum";
import { debug, DebugCategory } from "../../debug";
import { base64urlEncode } from "@phantom/base64url";
import { getExplorerUrl } from "@phantom/constants";
import bs58 from "bs58";

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
  addressTypes: AddressType[];
}

export class InjectedProvider implements Provider {
  private connected: boolean = false;
  private addresses: WalletAddress[] = [];
  private addressTypes: AddressType[];
  private phantom: any;
  
  // Event management
  private eventListeners: Map<EmbeddedProviderEvent, Set<EventCallback>> = new Map();
  private browserInjectedCleanupFunctions: (() => void)[] = [];
  private eventsInitialized: boolean = false;

  constructor(config: InjectedProviderConfig) {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Initializing InjectedProvider", { config });

    // Store config values
    this.addressTypes = config.addressTypes || [AddressType.solana, AddressType.ethereum];
    debug.log(DebugCategory.INJECTED_PROVIDER, "Address types configured", { addressTypes: this.addressTypes });

    // Initialize phantom instance with plugins based on enabled address types
    const plugins: any[] = [createExtensionPlugin()]; // Always include extension plugin

    if (this.addressTypes.includes(AddressType.solana)) {
      plugins.push(createSolanaPlugin());
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana plugin added");
    }

    if (this.addressTypes.includes(AddressType.ethereum)) {
      plugins.push(createEthereumPlugin());
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum plugin added");
    }

    debug.log(DebugCategory.INJECTED_PROVIDER, "Creating Phantom instance with plugins", {
      pluginCount: plugins.length,
    });
    this.phantom = createPhantom({ plugins });
    
    debug.info(DebugCategory.INJECTED_PROVIDER, "InjectedProvider initialized");
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
      if (!this.phantom.extension.isInstalled()) {
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
        await this.phantom.solana.disconnect();
        debug.log(DebugCategory.INJECTED_PROVIDER, "Solana disconnected successfully");
      } catch (err) {
        // Ignore errors if Solana wasn't connected
        debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to disconnect Solana", { error: err });
      }
    }

    // Disconnect from Ethereum if enabled (no-op for Ethereum)
    if (this.addressTypes.includes(AddressType.ethereum)) {
      try {
        await this.phantom.ethereum.disconnect();
        debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum disconnected successfully");
      } catch (err) {
        // Ignore errors if Ethereum wasn't connected
        debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to disconnect Ethereum", { error: err });
      }
    }

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

  async signMessage(params: SignMessageParams): Promise<SignMessageResult> {
    if (!this.connected) {
      throw new Error("Wallet not connected");
    }

    const networkPrefix = params.networkId.split(":")[0].toLowerCase();
    let signatureResult: string;

    if (networkPrefix === "solana") {
      // Sign with Solana provider using browser-injected-sdk - message is already a native string
      const { signature } = await this.phantom.solana.signMessage(new TextEncoder().encode(params.message));

      // Convert Uint8Array signature to base58 string (standard Solana format)
      signatureResult = bs58.encode(signature);
    } else if (networkPrefix === "ethereum" || networkPrefix === "polygon" || networkPrefix === "eip155") {
      // Get the first address
      const address = this.addresses.find(addr => addr.addressType === AddressType.ethereum)?.address;
      if (!address) {
        throw new Error("No address available");
      }

      // TODO: Switch to the right chain

      // Sign with Ethereum provider using browser-injected-sdk - message is already a native string
      const signature = await this.phantom.ethereum.signPersonalMessage(params.message, address);

      signatureResult = signature;
    } else {
      throw new Error(`Network ${params.networkId} is not supported for injected wallets`);
    }

    // Parse the signature using the unified parser to get consistent response format
    return {
      signature: signatureResult,
      rawSignature: base64urlEncode(signatureResult),
    };
  }

  async signAndSendTransaction(params: SignAndSendTransactionParams): Promise<SignedTransaction> {
    if (!this.connected) {
      throw new Error("Wallet not connected");
    }

    const networkPrefix = params.networkId.split(":")[0].toLowerCase();

    if (networkPrefix === "solana") {
      // Handle native transaction objects based on provider type
      const transaction = params.transaction;

      const result = await this.phantom.solana.signAndSendTransaction(transaction);
      return {
        hash: result.signature,
        rawTransaction: base64urlEncode(result.signature),
        blockExplorer: getExplorerUrl(params.networkId, "transaction", result.signature),
      };
    } else if (networkPrefix === "ethereum" || networkPrefix === "polygon" || networkPrefix === "eip155") {
      // Helper function to ensure hex format
      const toHex = (value: any): string | undefined => {
        if (!value) return undefined;
        if (typeof value === "string" && value.startsWith("0x")) return value;
        if (typeof value === "string") return value; // Assume it's already hex without prefix
        return "0x" + value.toString(16);
      };

      // For Ethereum networks, transaction is a native object (Viem format)
      const txRequest = {
        to: params.transaction.to,
        value: params.transaction.value ? toHex(params.transaction.value) : "0x0",
        gas: toHex(params.transaction.gas),
        gasPrice: toHex(params.transaction.gasPrice),
        maxFeePerGas: toHex(params.transaction.maxFeePerGas),
        maxPriorityFeePerGas: toHex(params.transaction.maxPriorityFeePerGas),
        data: params.transaction.data || "0x",
      };

      // TODO: Switch to the right chain

      // Send transaction using browser-injected-sdk
      const txHash = await this.phantom.ethereum.sendTransaction(txRequest);

      return {
        hash: txHash,
        rawTransaction: base64urlEncode(txHash),
        blockExplorer: getExplorerUrl(params.networkId, "transaction", txHash),
      };
    }

    throw new Error(`Network ${params.networkId} is not supported for injected wallets`);
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
    if (this.addressTypes.includes(AddressType.solana) && this.phantom.solana) {
      this.setupSolanaEvents();
    }

    // Set up Ethereum events if enabled  
    if (this.addressTypes.includes(AddressType.ethereum) && this.phantom.ethereum) {
      this.setupEthereumEvents();
    }
  }

  private setupSolanaEvents(): void {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up Solana event listeners");

    // Map Solana connect event to unified connect event
    const solanaConnectCleanup = this.phantom.solana.addEventListener("connect", (publicKey: string) => {
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
    });

    // Map Solana disconnect event to unified disconnect event
    const solanaDisconnectCleanup = this.phantom.solana.addEventListener("disconnect", () => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana disconnect event received");
      
      // Update our internal state
      this.addresses = this.addresses.filter(addr => addr.addressType !== AddressType.solana);
      this.connected = this.addresses.length > 0;
      
      // Emit unified disconnect event
      this.emit("disconnect", {
        source: "injected-extension",
      });
    });

    // Map Solana account changed to reconnect event
    const solanaAccountChangedCleanup = this.phantom.solana.addEventListener("accountChanged", (publicKey: string) => {
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
    });

    // Store cleanup functions
    this.browserInjectedCleanupFunctions.push(
      solanaConnectCleanup,
      solanaDisconnectCleanup,
      solanaAccountChangedCleanup
    );
  }

  private setupEthereumEvents(): void {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up Ethereum event listeners");

    // Map Ethereum connect event to unified connect event
    const ethConnectCleanup = this.phantom.ethereum.addEventListener("connect", (accounts: string[]) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum connect event received", { accounts });
      
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
    });

    // Map Ethereum disconnect event to unified disconnect event
    const ethDisconnectCleanup = this.phantom.ethereum.addEventListener("disconnect", () => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum disconnect event received");
      
      // Update our internal state
      this.addresses = this.addresses.filter(addr => addr.addressType !== AddressType.ethereum);
      this.connected = this.addresses.length > 0;
      
      // Emit unified disconnect event
      this.emit("disconnect", {
        source: "injected-extension",
      });
    });

    // Map Ethereum account changed to reconnect event
    const ethAccountChangedCleanup = this.phantom.ethereum.addEventListener("accountChanged", (accounts: string[]) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum account changed event received", { accounts });
      
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
    });

    // Store cleanup functions
    this.browserInjectedCleanupFunctions.push(
      ethConnectCleanup,
      ethDisconnectCleanup,
      ethAccountChangedCleanup
    );
  }
}
