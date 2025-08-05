import type {
  Provider,
  ConnectResult,
  SignMessageParams,
  SignAndSendTransactionParams,
  SignedTransaction,
  WalletAddress,
  AuthOptions,
} from "../../types";
import { AddressType } from "@phantom/client";
import { createPhantom, createExtensionPlugin } from "@phantom/browser-injected-sdk";
import { createSolanaPlugin } from "@phantom/browser-injected-sdk/solana";
import { createEthereumPlugin } from "@phantom/browser-injected-sdk/ethereum";
import { debug, DebugCategory } from "../../debug";

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

  constructor(config: InjectedProviderConfig) {
    debug.log(DebugCategory.INJECTED_PROVIDER, 'Initializing InjectedProvider', { config });
    
    // Store config values
    this.addressTypes = config.addressTypes || [AddressType.solana, AddressType.ethereum];
    debug.log(DebugCategory.INJECTED_PROVIDER, 'Address types configured', { addressTypes: this.addressTypes });

    // Initialize phantom instance with plugins based on enabled address types
    const plugins: any[] = [createExtensionPlugin()]; // Always include extension plugin

    if (this.addressTypes.includes(AddressType.solana)) {
      plugins.push(createSolanaPlugin());
      debug.log(DebugCategory.INJECTED_PROVIDER, 'Solana plugin added');
    }

    if (this.addressTypes.includes(AddressType.ethereum)) {
      plugins.push(createEthereumPlugin());
      debug.log(DebugCategory.INJECTED_PROVIDER, 'Ethereum plugin added');
    }

    debug.log(DebugCategory.INJECTED_PROVIDER, 'Creating Phantom instance with plugins', { pluginCount: plugins.length });
    this.phantom = createPhantom({ plugins });
    debug.info(DebugCategory.INJECTED_PROVIDER, 'InjectedProvider initialized');
  }

  async connect(authOptions?: AuthOptions): Promise<ConnectResult> {
    debug.info(DebugCategory.INJECTED_PROVIDER, 'Starting injected provider connect', { 
      addressTypes: this.addressTypes,
      authOptionsIgnored: !!authOptions // Note: authOptions are ignored for injected provider
    });

    if (!this.phantom.extension.isInstalled()) {
      debug.error(DebugCategory.INJECTED_PROVIDER, 'Phantom wallet extension not found');
      throw new Error("Phantom wallet not found");
    }
    debug.log(DebugCategory.INJECTED_PROVIDER, 'Phantom extension detected');

    const connectedAddresses: WalletAddress[] = [];

    // Try Solana if enabled
    if (this.addressTypes.includes(AddressType.solana)) {
      debug.log(DebugCategory.INJECTED_PROVIDER, 'Attempting Solana connection');
      try {
        const publicKey = await this.phantom.solana.connect();
        if (publicKey) {
          connectedAddresses.push({
            addressType: AddressType.solana,
            address: publicKey,
          });
          debug.info(DebugCategory.INJECTED_PROVIDER, 'Solana connected successfully', { address: publicKey });
        }
      } catch (err) {
        // Continue to other address types
        debug.warn(DebugCategory.INJECTED_PROVIDER, 'Failed to connect Solana', { error: err });
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
        debug.warn(DebugCategory.INJECTED_PROVIDER, 'Failed to connect Ethereum', { error: err });
      }
    }

    if (connectedAddresses.length === 0) {
      throw new Error("Failed to connect to any supported wallet provider");
    }

    this.addresses = connectedAddresses;
    this.connected = true;

    return {
      addresses: this.addresses,
      status: "completed",
      // walletId is not applicable for injected providers
    };
  }

  async disconnect(): Promise<void> {
    // Disconnect from Solana if enabled
    if (this.addressTypes.includes(AddressType.solana)) {
      try {
        await this.phantom.solana.disconnect();
      } catch (err) {
        // Ignore errors if Solana wasn't connected
        console.error("Failed to disconnect Solana:", err);
      }
    }

    // Disconnect from Ethereum if enabled (no-op for Ethereum)
    if (this.addressTypes.includes(AddressType.ethereum)) {
      try {
        await this.phantom.ethereum.disconnect();
      } catch (err) {
        // Ignore errors if Ethereum wasn't connected
        console.error("Failed to disconnect Ethereum:", err);
      }
    }

    this.connected = false;
    this.addresses = [];
  }

  async signMessage(params: SignMessageParams): Promise<string> {
    if (!this.connected) {
      throw new Error("Wallet not connected");
    }

    const networkPrefix = params.networkId.split(":")[0].toLowerCase();

    if (networkPrefix === "solana") {
      // Sign with Solana provider using browser-injected-sdk - message is already a native string
      const { signature } = await this.phantom.solana.signMessage(new TextEncoder().encode(params.message));

      // Return signature as hex string or base58 depending on provider
      return Array.from(signature)
        .map((b: any) => b.toString(16).padStart(2, "0"))
        .join("");
    } else if (networkPrefix === "ethereum" || networkPrefix === "polygon" || networkPrefix === "eip155") {
      // Get the first address
      const address = this.addresses.find(addr => addr.addressType === AddressType.ethereum)?.address;
      if (!address) {
        throw new Error("No address available");
      }

      // TODO: Switch to the right chain

      // Sign with Ethereum provider using browser-injected-sdk - message is already a native string
      const signature = await this.phantom.ethereum.signPersonalMessage(params.message, address);

      return signature;
    }

    throw new Error(`Network ${params.networkId} is not supported for injected wallets`);
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
        rawTransaction: result.signature,
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
        rawTransaction: txHash,
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
}
