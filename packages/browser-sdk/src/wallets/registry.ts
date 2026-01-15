import type { IEthereumChain, ISolanaChain } from "@phantom/chain-interfaces";
import { AddressType } from "../types";
import { discoverWallets } from "./discovery";
import { debug, DebugCategory } from "../debug";
import { InjectedWalletSolanaChain } from "../providers/injected/chains/InjectedWalletSolanaChain";
import { WalletStandardSolanaAdapter } from "../providers/injected/chains/WalletStandardSolanaAdapter";
import { InjectedWalletEthereumChain } from "../providers/injected/chains/InjectedWalletEthereumChain";
import type { WalletStandardWallet } from "../providers/injected/chains/walletStandardTypes";
import type { Extension } from "@phantom/browser-injected-sdk";
import type { AutoConfirmPlugin } from "@phantom/browser-injected-sdk/auto-confirm";

export type InjectedWalletId = string;

export interface WalletProviders {
  /** EIP-6963 Ethereum provider (window.ethereum-like) */
  ethereum?: IEthereumChain;
  /** Wallet Standard Solana wallet object */
  solana?: ISolanaChain;
}

export interface InjectedWalletInfo {
  id: InjectedWalletId;
  name: string;
  icon?: string;
  addressTypes: AddressType[];
  providers?: WalletProviders;
  /** Reverse DNS identifier from EIP-6963 (for potential future matching with Wallet Standard) */
  rdns?: string;
  discovery?: "standard" | "eip6963" | "phantom";
}

/**
 * Phantom-specific wallet info that includes the Phantom instance for auto-confirm access
 */
export interface PhantomInjectedWalletInfo extends InjectedWalletInfo {
  id: "phantom";
  isPhantom: true;
  phantomInstance: PhantomExtended;
}

/**
 * PhantomExtended interface - matches the structure from InjectedProvider
 */
export interface PhantomExtended {
  extension: Extension;
  solana: ISolanaChain;
  ethereum: IEthereumChain;
  autoConfirm: AutoConfirmPlugin;
}

/**
 * Type guard to check if a wallet is Phantom
 */
export function isPhantomWallet(wallet: InjectedWalletInfo | undefined): wallet is PhantomInjectedWalletInfo {
  return wallet !== undefined && wallet.id === "phantom" && "isPhantom" in wallet && wallet.isPhantom === true;
}

/**
 * Type guard to check if a provider is a Wallet Standard wallet
 */
function isWalletStandardWallet(provider: unknown): provider is WalletStandardWallet {
  return (
    provider !== null &&
    typeof provider === "object" &&
    "features" in provider &&
    typeof (provider as any).features === "object"
  );
}

export class InjectedWalletRegistry {
  private wallets = new Map<InjectedWalletId, InjectedWalletInfo>();
  public discoveryPromise: Promise<void> | null = null;

  register(info: InjectedWalletInfo): void {
    // Wrap providers with debug-enabled chain classes
    const wrappedProviders: WalletProviders = {};

    if (info.providers?.solana) {
      if (isWalletStandardWallet(info.providers.solana)) {
        // Use Wallet Standard adapter directly (it already implements ISolanaChain with debug logging)
        wrappedProviders.solana = new WalletStandardSolanaAdapter(info.providers.solana, info.id, info.name);
        debug.log(DebugCategory.BROWSER_SDK, "Wrapped Wallet Standard Solana wallet with adapter", {
          walletId: info.id,
          walletName: info.name,
        });
      } else {
        // Wrap regular ISolanaChain provider with debug logging wrapper
        wrappedProviders.solana = new InjectedWalletSolanaChain(info.providers.solana, info.id, info.name);
        debug.log(DebugCategory.BROWSER_SDK, "Wrapped Solana provider with InjectedWalletSolanaChain", {
          walletId: info.id,
          walletName: info.name,
        });
      }
    }

    if (info.providers?.ethereum) {
      wrappedProviders.ethereum = new InjectedWalletEthereumChain(info.providers.ethereum, info.id, info.name);
      debug.log(DebugCategory.BROWSER_SDK, "Wrapped Ethereum provider with InjectedWalletEthereumChain", {
        walletId: info.id,
        walletName: info.name,
      });
    }

    const wrappedInfo: InjectedWalletInfo = {
      ...info,
      providers: Object.keys(wrappedProviders).length > 0 ? wrappedProviders : info.providers,
    };

    this.wallets.set(info.id, wrappedInfo);
  }

  /**
   * Register Phantom wallet with its instance
   * This creates wrapped providers and stores the Phantom instance for auto-confirm access
   * Uses unified InjectedWallet chains for both Phantom and external wallets
   */
  registerPhantom(phantomInstance: PhantomExtended, addressTypes: AddressType[]): void {
    const wrappedProviders: WalletProviders = {};

    if (addressTypes.includes(AddressType.solana) && phantomInstance.solana) {
      wrappedProviders.solana = new InjectedWalletSolanaChain(phantomInstance.solana, "phantom", "Phantom");
      debug.log(DebugCategory.BROWSER_SDK, "Created InjectedWalletSolanaChain wrapper for Phantom", {
        walletId: "phantom",
      });
    }

    if (addressTypes.includes(AddressType.ethereum) && phantomInstance.ethereum) {
      wrappedProviders.ethereum = new InjectedWalletEthereumChain(phantomInstance.ethereum, "phantom", "Phantom");
      debug.log(DebugCategory.BROWSER_SDK, "Created InjectedWalletEthereumChain wrapper for Phantom", {
        walletId: "phantom",
      });
    }

    const phantomWallet: PhantomInjectedWalletInfo = {
      id: "phantom",
      name: "Phantom",
      icon: "", // Icon will be rendered from icons package in UI components
      addressTypes,
      providers: wrappedProviders,
      isPhantom: true,
      phantomInstance,
      discovery: "phantom",
    };

    this.wallets.set("phantom", phantomWallet);
    debug.log(DebugCategory.BROWSER_SDK, "Registered Phantom wallet with chain wrappers", {
      addressTypes,
      hasSolana: !!wrappedProviders.solana,
      hasEthereum: !!wrappedProviders.ethereum,
    });
  }

  unregister(id: InjectedWalletId): void {
    this.wallets.delete(id);
  }

  has(id: InjectedWalletId): boolean {
    return this.wallets.has(id);
  }

  getById(id: InjectedWalletId): InjectedWalletInfo | undefined {
    return this.wallets.get(id);
  }

  getAll(): InjectedWalletInfo[] {
    return Array.from(this.wallets.values());
  }

  getByAddressTypes(addressTypes: AddressType[]): InjectedWalletInfo[] {
    if (addressTypes.length === 0) {
      return this.getAll();
    }
    const allowed = new Set(addressTypes);
    return this.getAll().filter(wallet => wallet.addressTypes.some(t => allowed.has(t)));
  }

  discover(addressTypes?: AddressType[]): Promise<void> {
    // If discovery is already in progress, return the existing promise
    if (this.discoveryPromise) {
      return this.discoveryPromise;
    }

    debug.log(DebugCategory.BROWSER_SDK, "Starting wallet discovery", { addressTypes });

    this.discoveryPromise = discoverWallets(addressTypes)
      .then(discoveredWallets => {
        // Filter by address types if provided
        const relevantWallets = addressTypes
          ? discoveredWallets.filter(wallet => wallet.addressTypes.some(type => addressTypes.includes(type)))
          : discoveredWallets;

        // Register all relevant wallets
        for (const wallet of relevantWallets) {
          // Special handling for Phantom - use registerPhantom if it has phantomInstance
          if (wallet.id === "phantom" && isPhantomWallet(wallet)) {
            this.registerPhantom(wallet.phantomInstance, wallet.addressTypes);
          } else {
            this.register(wallet);
          }
          debug.log(DebugCategory.BROWSER_SDK, "Registered discovered wallet", {
            id: wallet.id,
            name: wallet.name,
            addressTypes: wallet.addressTypes,
          });
        }

        debug.info(DebugCategory.BROWSER_SDK, "Wallet discovery completed", {
          totalDiscovered: discoveredWallets.length,
          relevantWallets: relevantWallets.length,
        });
      })
      .catch(error => {
        debug.warn(DebugCategory.BROWSER_SDK, "Wallet discovery failed", { error });
        // Reset promise on error so it can be retried
        this.discoveryPromise = null;
        throw error;
      });

    return this.discoveryPromise;
  }
}

// Singleton instance of the wallet registry
let walletRegistry: InjectedWalletRegistry | null = null;

export function getWalletRegistry(): InjectedWalletRegistry {
  if (!walletRegistry) {
    walletRegistry = new InjectedWalletRegistry();
  }
  return walletRegistry;
}
