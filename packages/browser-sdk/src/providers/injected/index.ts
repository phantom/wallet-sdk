import type {
  Provider,
  ConnectResult,
  WalletAddress,
  AuthOptions,
} from "../../types";
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
  addressTypes: AddressType[];
}

export class InjectedProvider implements Provider {
  private connected: boolean = false;
  private addresses: WalletAddress[] = [];
  private addressTypes: AddressType[];
  
  // Chain instances
  private _solanaChain?: ISolanaChain;
  private _ethereumChain?: IEthereumChain;

  constructor(config: InjectedProviderConfig) {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Initializing InjectedProvider", { config });

    // Store config values
    this.addressTypes = config.addressTypes || [AddressType.solana, AddressType.ethereum];
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

    if (!isPhantomExtensionInstalled()) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "Phantom wallet extension not found");
      throw new Error("Phantom wallet not found");
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
        }
      } catch (err) {
        // Continue to other address types
        debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to connect Ethereum", { error: err });
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
        await this.solana.disconnect();
      } catch (err) {
        // Ignore errors if Solana wasn't connected
        console.error("Failed to disconnect Solana:", err);
      }
    }

    // Reset chain instances on disconnect
    this._solanaChain = undefined;
    this._ethereumChain = undefined;

    this.connected = false;
    this.addresses = [];
  }

  getAddresses(): WalletAddress[] {
    return this.addresses;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
