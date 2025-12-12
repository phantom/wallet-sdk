import type { InjectedWalletInfo, PhantomExtended } from "./registry";
import { AddressType as ClientAddressType } from "@phantom/client";
import type { ISolanaChain, IEthereumChain } from "@phantom/chain-interfaces";
import { isPhantomExtensionInstalled } from "@phantom/browser-injected-sdk";
import { createPhantom, createExtensionPlugin, type Plugin } from "@phantom/browser-injected-sdk";
import { createSolanaPlugin } from "@phantom/browser-injected-sdk/solana";
import { createEthereumPlugin } from "@phantom/browser-injected-sdk/ethereum";
import { createAutoConfirmPlugin } from "@phantom/browser-injected-sdk/auto-confirm";
import { debug, DebugCategory } from "../debug";

/**
 * EIP-6963 Provider Info interface
 * See: https://eips.ethereum.org/EIPS/eip-6963
 */
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string; // Reverse domain name identifier
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any; // The actual provider object (window.ethereum-like)
}

interface WalletStandardWallet {
  readonly name: string;
  readonly icon: string;
  readonly version: string;
  readonly chains: readonly string[];
  readonly features: Record<string, unknown>; // Features is an object mapping feature names to implementations
  readonly accounts: readonly WalletStandardAccount[];
}

interface WalletStandardAccount {
  readonly address: string;
  readonly publicKey: Uint8Array;
  readonly chains: readonly string[];
  readonly features: readonly string[];
}

function generateWalletIdFromEIP6963(info: EIP6963ProviderInfo): string {
  // If rdns exists, use it as the ID (reverse domain format: "com.example.wallet" -> "wallet-example-com")
  // This is the stable identifier provided by the wallet
  if (info.rdns) {
    return info.rdns.split(".").reverse().join("-");
  }
  // Fallback to normalized name if no rdns
  return info.name.toLowerCase().replace(/\s+/g, "-");
}

function generateWalletIdFromName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function processEIP6963Providers(providers: Map<string, EIP6963ProviderDetail>): InjectedWalletInfo[] {
  const wallets: InjectedWalletInfo[] = [];

  debug.log(DebugCategory.BROWSER_SDK, "Processing EIP-6963 providers", {
    providerCount: providers.size,
    providerNames: Array.from(providers.values()).map(d => d.info.name),
  });

  for (const [, detail] of providers) {
    const { info, provider } = detail;

    // Skip Phantom as it's handled by our custom discovery
    // Check both name and rdns to catch different variations
    const isPhantom =
      info.name.toLowerCase().includes("phantom") ||
      (info.rdns && (info.rdns.toLowerCase().includes("phantom") || info.rdns.toLowerCase() === "app.phantom"));

    if (isPhantom) {
      debug.log(DebugCategory.BROWSER_SDK, "Skipping Phantom from EIP-6963", { name: info.name, rdns: info.rdns });
      continue;
    }

    const walletId = generateWalletIdFromEIP6963(info);

    debug.log(DebugCategory.BROWSER_SDK, "Discovered EIP-6963 wallet", {
      walletId,
      walletName: info.name,
      rdns: info.rdns,
    });

    wallets.push({
      id: walletId,
      name: info.name,
      icon: info.icon,
      addressTypes: [ClientAddressType.ethereum],
      providers: {
        // EIP-6963 provider implements EIP-1193 interface (IEthereumChain)
        ethereum: provider as unknown as IEthereumChain,
      },
      rdns: info.rdns, // Store rdns for potential future matching
      discovery: "eip6963",
    });
  }

  debug.log(DebugCategory.BROWSER_SDK, "EIP-6963 discovery completed", {
    discoveredCount: wallets.length,
    walletIds: wallets.map(w => w.id),
  });

  return wallets;
}

export function discoverEthereumWallets(): Promise<InjectedWalletInfo[]> {
  return new Promise(resolve => {
    const discoveredProviders = new Map<string, EIP6963ProviderDetail>();

    if (typeof window === "undefined") {
      resolve([]);
      return;
    }

    const handleAnnounce = (event: CustomEvent<EIP6963ProviderDetail>) => {
      const detail = event.detail;
      if (detail?.info && detail?.provider) {
        discoveredProviders.set(detail.info.uuid, detail);
      }
    };

    window.addEventListener("eip6963:announceProvider", handleAnnounce as EventListener);

    window.dispatchEvent(new Event("eip6963:requestProvider"));

    const processProviders = () => {
      const wallets = processEIP6963Providers(discoveredProviders);

      window.removeEventListener("eip6963:announceProvider", handleAnnounce as EventListener);

      resolve(wallets);
    };

    setTimeout(processProviders, 400);
  });
}

export async function discoverSolanaWallets(): Promise<InjectedWalletInfo[]> {
  const wallets: InjectedWalletInfo[] = [];

  if (typeof window === "undefined" || typeof navigator === "undefined") {
    debug.log(DebugCategory.BROWSER_SDK, "Wallet Standard discovery skipped (not in browser environment)");
    return wallets;
  }

  // Initialize Wallet Standard registry - matching @wallet-standard/app behavior
  // Based on https://github.com/wallet-standard/wallet-standard/blob/master/packages/core/app/src/wallets.ts
  const registeredWalletsSet = new Set<WalletStandardWallet>();
  let cachedWalletsArray: WalletStandardWallet[] | undefined;

  function addRegisteredWallet(wallet: WalletStandardWallet) {
    cachedWalletsArray = undefined;
    registeredWalletsSet.add(wallet);
    const featureKeys = wallet.features ? Object.keys(wallet.features) : [];
    debug.log(DebugCategory.BROWSER_SDK, "Wallet registered", {
      name: wallet.name,
      chains: wallet.chains,
      featureKeys,
      totalWallets: registeredWalletsSet.size,
    });
  }

  function removeRegisteredWallet(wallet: WalletStandardWallet) {
    cachedWalletsArray = undefined;
    registeredWalletsSet.delete(wallet);
  }

  function getRegisteredWallets(): readonly WalletStandardWallet[] {
    if (!cachedWalletsArray) {
      cachedWalletsArray = [...registeredWalletsSet];
    }
    return cachedWalletsArray;
  }

  // Register function that wallets will call
  function register(...wallets: WalletStandardWallet[]): () => void {
    // Filter out wallets that have already been registered
    wallets = wallets.filter(wallet => !registeredWalletsSet.has(wallet));
    if (!wallets.length) {
      return () => {}; // No-op unregister
    }

    wallets.forEach(wallet => addRegisteredWallet(wallet));

    // Return unregister function
    return function unregister(): void {
      wallets.forEach(wallet => removeRegisteredWallet(wallet));
    };
  }

  // Create the register API object that will be passed to wallets
  const registerAPI = Object.freeze({ register });

  // Listen for 'wallet-standard:register-wallet' events
  // The event.detail is a callback function that wallets provide
  // We call that callback with the register API, and the wallet's callback will call register(wallet)
  const handleRegisterWalletEvent = (event: CustomEvent) => {
    const callback = (event as any).detail;
    if (typeof callback === "function") {
      try {
        callback(registerAPI);
      } catch (error) {
        debug.warn(DebugCategory.BROWSER_SDK, "Error calling wallet registration callback", { error });
      }
    }
  };

  try {
    window.addEventListener("wallet-standard:register-wallet", handleRegisterWalletEvent as EventListener);
  } catch (error) {
    debug.warn(DebugCategory.BROWSER_SDK, "Could not add register-wallet event listener", { error });
  }

  // Dispatch 'wallet-standard:app-ready' event to notify wallets we're ready
  // The event.detail contains the register API object
  class AppReadyEvent extends Event {
    readonly detail: { register: typeof register };

    constructor(api: { register: typeof register }) {
      super("wallet-standard:app-ready", {
        bubbles: false,
        cancelable: false,
        composed: false,
      });
      this.detail = api;
    }
  }

  try {
    window.dispatchEvent(new AppReadyEvent(registerAPI));
    debug.log(DebugCategory.BROWSER_SDK, "Dispatched wallet-standard:app-ready event");
  } catch (error) {
    debug.warn(DebugCategory.BROWSER_SDK, "Could not dispatch app-ready event", { error });
  }

  // Create the Wallet Standard API matching @wallet-standard/app behavior
  // getWallets() returns an object with get(), on(), and register() methods
  const walletsAPI = {
    getWallets: (): {
      get: () => readonly WalletStandardWallet[];
      on: (event: "register" | "unregister", listener: (...wallets: WalletStandardWallet[]) => void) => () => void;
      register: typeof register;
    } => {
      return {
        get: getRegisteredWallets,
        on: (_event: "register" | "unregister", _listener: (...wallets: WalletStandardWallet[]) => void) => {
          // For now, we don't implement the event listener system fully
          // The wallets are registered synchronously via the register function
          return () => {}; // No-op unsubscribe
        },
        register,
      };
    },
  };

  // Set it on navigator for Wallet Standard compatibility
  if (!(navigator as any).wallets) {
    (navigator as any).wallets = walletsAPI;
  }

  debug.log(DebugCategory.BROWSER_SDK, "Initialized Wallet Standard registry");

  // Wait a bit for wallets to respond to app-ready event
  // Give wallets time to dispatch register-wallet events
  await new Promise(resolve => setTimeout(resolve, 100));

  // Get the wallets API (we just created it, so it should exist)
  const existingWalletsAPI = (navigator as any).wallets || (window as any).wallets;

  if (!existingWalletsAPI || typeof existingWalletsAPI.getWallets !== "function") {
    const logData = {
      hasNavigator: !!navigator,
      hasWindow: typeof window !== "undefined",
      note: "Wallet Standard API not properly initialized",
    };
    debug.log(DebugCategory.BROWSER_SDK, "Wallet Standard API not available", logData);
    return wallets;
  }

  // Call getWallets() which returns an object with .get() method
  const walletsGetter = existingWalletsAPI.getWallets();
  const getWalletsFn = () => Promise.resolve([...walletsGetter.get()]);

  debug.log(DebugCategory.BROWSER_SDK, "Wallet Standard API detected, starting discovery");

  try {
    // Wallet Standard wallets may register asynchronously, so we try multiple times
    // We wait at least as long as EIP-6963 discovery (400ms) to ensure wallets have time to register
    let registeredWallets: WalletStandardWallet[] = [];
    let attempts = 0;
    const maxAttempts = 5;
    const initialDelay = 100;
    const eip6963Timeout = 400; // Match EIP-6963 discovery timeout

    // First, wait a bit for wallets to register (similar to EIP-6963)
    await new Promise(resolve => setTimeout(resolve, initialDelay));

    while (attempts < maxAttempts) {
      registeredWallets = await getWalletsFn!();

      const logData = {
        attempt: attempts + 1,
        walletCount: registeredWallets.length,
        walletNames: registeredWallets.map(w => w.name),
        chains: registeredWallets.flatMap(w => w.chains),
      };

      debug.log(DebugCategory.BROWSER_SDK, `Wallet Standard getWallets attempt ${attempts + 1}`, logData);
      // Also log to console for debugging

      // If we found wallets or this is the last attempt, break
      if (registeredWallets.length > 0 || attempts === maxAttempts - 1) {
        break;
      }

      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      attempts++;
    }

    // Ensure we've waited at least as long as EIP-6963 discovery
    const totalWaitTime = initialDelay + attempts * initialDelay;
    if (totalWaitTime < eip6963Timeout) {
      const remainingWait = eip6963Timeout - totalWaitTime;
      await new Promise(resolve => setTimeout(resolve, remainingWait));
      // Check one more time after the full wait
      registeredWallets = await getWalletsFn!();
    }

    debug.log(DebugCategory.BROWSER_SDK, "Wallet Standard getWallets final result", {
      walletCount: registeredWallets.length,
      walletNames: registeredWallets.map(w => w.name),
      attempts: attempts + 1,
    });

    for (const wallet of registeredWallets) {
      // Check if wallet supports Solana - Wallet Standard uses CAIP-2 format
      // Examples: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" (mainnet), "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" (devnet)
      // Some wallets might also use just "solana" as a chain identifier
      // Features is an object, not an array - check if it has Solana-related feature keys
      const supportsSolana =
        wallet.chains.some(chain => {
          const chainLower = chain.toLowerCase();
          return chainLower.startsWith("solana:") || chainLower === "solana";
        }) ||
        (wallet.features &&
          typeof wallet.features === "object" &&
          Object.keys(wallet.features).some(featureKey => {
            const featureLower = featureKey.toLowerCase();
            return (
              featureLower.includes("solana") ||
              featureLower.includes("standard:connect") ||
              featureLower.includes("standard:signTransaction")
            );
          }));

      if (!supportsSolana) {
        const featureKeys = wallet.features ? Object.keys(wallet.features) : [];
        debug.log(DebugCategory.BROWSER_SDK, "Wallet does not support Solana", {
          walletName: wallet.name,
          chains: wallet.chains,
          featureKeys,
        });
        continue;
      }

      // Skip Phantom as is handled by our injected provider
      if (wallet.name.toLowerCase().includes("phantom")) {
        debug.log(DebugCategory.BROWSER_SDK, "Skipping Phantom from Wallet Standard (handled separately)");
        continue;
      }

      const walletId = generateWalletIdFromName(wallet.name);

      // Log safe properties only (avoid circular references in features object)
      const safeFeatures = wallet.features ? Object.keys(wallet.features) : [];
      debug.log(DebugCategory.BROWSER_SDK, "Discovered Wallet Standard Solana wallet", {
        walletId,
        walletName: wallet.name,
        chains: wallet.chains,
        featureKeys: safeFeatures,
        icon: wallet.icon,
        version: wallet.version,
        accountCount: wallet.accounts?.length || 0,
      });

      // Pass the raw Wallet Standard wallet - it will be wrapped by InjectedWalletSolanaChain in registry.register()
      // Wallet Standard wallets implement the standard:connect and standard:signTransaction features
      // which are compatible with ISolanaChain interface
      wallets.push({
        id: walletId,
        name: wallet.name,
        icon: wallet.icon,
        addressTypes: [ClientAddressType.solana],
        providers: {
          // Cast to ISolanaChain - Wallet Standard wallets have compatible methods
          // The InjectedWalletSolanaChain wrapper will handle the actual method calls
          solana: wallet as any as ISolanaChain,
        },
        discovery: "standard",
      });
    }
  } catch (error) {
    debug.warn(DebugCategory.BROWSER_SDK, "Wallet Standard API error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // If Wallet Standard API fails, fall back silently
    // This is expected if no wallets have registered or API is not available
  }

  const finalLogData = {
    discoveredCount: wallets.length,
    walletIds: wallets.map(w => w.id),
    walletNames: wallets.map(w => w.name),
  };

  debug.log(DebugCategory.BROWSER_SDK, "Wallet Standard Solana discovery completed", finalLogData);

  return wallets;
}

/**
 * Discover Phantom wallet if extension is installed
 * Creates Phantom instance with plugins and returns wallet info
 */
export function discoverPhantomWallet(addressTypes: ClientAddressType[]): InjectedWalletInfo | null {
  if (typeof window === "undefined") {
    return null;
  }

  // Check if Phantom extension is installed
  if (!isPhantomExtensionInstalled()) {
    return null;
  }

  // Create Phantom instance with plugins
  const plugins: Plugin<any>[] = [createExtensionPlugin()];

  if (addressTypes.includes(ClientAddressType.solana)) {
    plugins.push(createSolanaPlugin());
  }

  if (addressTypes.includes(ClientAddressType.ethereum)) {
    plugins.push(createEthereumPlugin());
  }

  // Always add autoConfirm for Phantom
  plugins.push(createAutoConfirmPlugin());

  const phantomInstance = createPhantom({ plugins }) as unknown as PhantomExtended;

  return {
    id: "phantom",
    name: "Phantom",
    icon: undefined, // Icon will be rendered from icons package in UI components
    addressTypes,
    providers: {
      solana: addressTypes.includes(ClientAddressType.solana) ? (phantomInstance.solana as any) : undefined,
      ethereum: addressTypes.includes(ClientAddressType.ethereum) ? (phantomInstance.ethereum as any) : undefined,
    },
    isPhantom: true,
    phantomInstance,
    discovery: "phantom",
  } as InjectedWalletInfo & { isPhantom: true; phantomInstance: PhantomExtended };
}

export async function discoverWallets(addressTypes?: ClientAddressType[]): Promise<InjectedWalletInfo[]> {
  const requestedAddressTypes = addressTypes || [];

  debug.log(DebugCategory.BROWSER_SDK, "Starting all wallet discovery methods", {
    addressTypes: requestedAddressTypes,
  });

  const [solanaWallets, ethereumWallets] = await Promise.all([discoverSolanaWallets(), discoverEthereumWallets()]);
  const phantomWallet = discoverPhantomWallet(requestedAddressTypes);

  debug.log(DebugCategory.BROWSER_SDK, "All wallet discovery methods completed", {
    phantomFound: !!phantomWallet,
    solanaWalletsCount: solanaWallets.length,
    ethereumWalletsCount: ethereumWallets.length,
    solanaWalletIds: solanaWallets.map(w => w.id),
    ethereumWalletIds: ethereumWallets.map(w => w.id),
  });

  const walletMap = new Map<string, InjectedWalletInfo>();

  // Add Phantom first if available (so it's the default)
  if (phantomWallet) {
    walletMap.set("phantom", phantomWallet);
  }

  // Add other wallets and merge only by exact ID match
  // It's the wallet's responsibility to use consistent IDs across Wallet Standard and EIP-6963
  for (const wallet of [...solanaWallets, ...ethereumWallets]) {
    const existing = walletMap.get(wallet.id);

    if (existing) {
      // Merge wallets with the same ID (discovered via multiple methods)
      const mergedAddressTypes = Array.from(new Set([...existing.addressTypes, ...wallet.addressTypes]));
      const mergedProviders = {
        ...existing.providers,
        ...wallet.providers,
      };
      const mergedWallet = {
        ...existing,
        addressTypes: mergedAddressTypes,
        // Prefer icon from the most recent discovery
        icon: wallet.icon || existing.icon,
        providers: mergedProviders,
      };
      walletMap.set(wallet.id, mergedWallet);
      debug.log(DebugCategory.BROWSER_SDK, "Merged wallet by ID", {
        walletName: wallet.name,
        walletId: wallet.id,
        existingAddressTypes: existing.addressTypes,
        newAddressTypes: wallet.addressTypes,
        mergedAddressTypes,
        existingProviders: Object.keys(existing.providers || {}),
        newProviders: Object.keys(wallet.providers || {}),
        mergedProviders: Object.keys(mergedProviders),
      });
      debug.log(DebugCategory.BROWSER_SDK, "Merged wallet from multiple discovery methods", {
        walletId: wallet.id,
        walletName: wallet.name,
        existingAddressTypes: existing.addressTypes,
        newAddressTypes: wallet.addressTypes,
        mergedAddressTypes,
      });
    } else {
      walletMap.set(wallet.id, wallet);
    }
  }

  return Array.from(walletMap.values());
}
