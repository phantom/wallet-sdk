import type { Provider, ConnectResult, WalletAddress, AuthOptions } from "../../types";
import type { EmbeddedProviderEvent, EventCallback } from "@phantom/embedded-provider-core";
import { AddressType } from "@phantom/client";
import type {
  AutoConfirmEnableParams,
  AutoConfirmResult,
  AutoConfirmSupportedChainsResult,
} from "@phantom/browser-injected-sdk/auto-confirm";

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
  features(): Promise<{ features: string[] }>;
  getUser(): Promise<{ authUserId?: string } | undefined>;
}

declare global {
  interface Window {
    phantom?:
      | {
          solana?: unknown;
          ethereum?: unknown;
          app?: PhantomApp;
        }
      | undefined;
  }
}

import { debug, DebugCategory } from "../../debug";
import { getWalletRegistry, type InjectedWalletRegistry, type InjectedWalletInfo, isPhantomWallet, type PhantomExtended } from "../../wallets/registry";
import type { ISolanaChain, IEthereumChain } from "@phantom/chain-interfaces";

const WAS_CONNECTED_KEY = "phantom-injected-was-connected";
const WAS_CONNECTED_VALUE = "true";
const LAST_WALLET_ID_KEY = "phantom-injected-last-wallet-id";

export interface InjectedProviderConfig {
  addressTypes: AddressType[];
}

export class InjectedProvider implements Provider {
  private addressTypes: AddressType[];
  private walletRegistry: InjectedWalletRegistry;
  private selectedWalletId: string | null = null;

  // Event management
  private eventListeners: Map<EmbeddedProviderEvent, Set<EventCallback>> = new Map();
  private browserInjectedCleanupFunctions: (() => void)[] = [];
  private eventsInitialized: boolean = false;
  private externalWalletEventListenersSetup: Set<string> = new Set(); // Track which wallets have event listeners set up

  constructor(config: InjectedProviderConfig) {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Initializing InjectedProvider", { config });

    // Store config values
    this.addressTypes = config.addressTypes;
    this.walletRegistry = getWalletRegistry();
    debug.log(DebugCategory.INJECTED_PROVIDER, "Address types configured", { addressTypes: this.addressTypes });

    // Trigger wallet discovery (will register Phantom if available)
    this.walletRegistry.discover(this.addressTypes).catch(error => {
      debug.warn(DebugCategory.INJECTED_PROVIDER, "Wallet discovery failed during initialization", { error });
    });
    
    debug.info(DebugCategory.INJECTED_PROVIDER, "InjectedProvider initialized");
  }

  /**
   * Wait for wallet discovery to complete if the wallet is not yet in the registry
   * This is needed for auto-connect when the last wallet was an external wallet
   */
  private async waitForWalletDiscovery(walletId: string): Promise<void> {
    // If wallet is already in registry, no need to wait
    if (this.walletRegistry.has(walletId)) {
      return;
    }

    debug.log(DebugCategory.INJECTED_PROVIDER, "Wallet not found in registry, waiting for discovery", {
      walletId,
    });

    // Call registry.discover() which will reuse existing discovery if in progress
    try {
      await this.walletRegistry.discover(this.addressTypes);
      debug.log(DebugCategory.INJECTED_PROVIDER, "Wallet discovery completed", { walletId });
    } catch (error) {
      debug.warn(DebugCategory.INJECTED_PROVIDER, "Wallet discovery failed", {
        walletId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }


  get solana(): ISolanaChain {
    if (!this.addressTypes.includes(AddressType.solana)) {
      throw new Error("Solana not enabled for this provider");
    }

    const walletId = this.selectedWalletId || "phantom";
    const walletInfo = this.walletRegistry.getById(walletId);
    
    if (!walletInfo) {
      // If wallet not found, it might still be discovering
      // Check if discovery is in progress by checking if the registry has a discovery promise
      const registry = this.walletRegistry as any;
      if (registry.discoveryPromise) {
        throw new Error(
          `Wallet "${walletId}" not found. Wallet discovery is still in progress. ` +
          `Please wait for sdk.discoverWallets() to complete before accessing chain properties.`
        );
      }
      throw new Error(
        `Wallet "${walletId}" not found. Please ensure wallet discovery has completed. ` +
        `Make sure you call sdk.discoverWallets() and await it before accessing chain properties.`
      );
    }

    if (!walletInfo.providers?.solana) {
      throw new Error(
        `Selected wallet "${walletInfo.name}" does not support Solana. ` +
        `This wallet only supports: ${walletInfo.addressTypes.join(", ")}. ` +
        `Make sure your SDK config includes Solana in addressTypes.`
      );
    }
    return walletInfo.providers.solana;
  }

  /**
   * Access to Ethereum chain operations
   */
  get ethereum(): IEthereumChain {
    if (!this.addressTypes.includes(AddressType.ethereum)) {
      throw new Error("Ethereum not enabled for this provider");
    }

    const walletId = this.selectedWalletId || "phantom";
    const walletInfo = this.walletRegistry.getById(walletId);
    
    if (!walletInfo) {
      // If wallet not found, it might still be discovering
      const registry = this.walletRegistry as any;
      if (registry.discoveryPromise) {
        throw new Error(
          `Wallet "${walletId}" not found. Wallet discovery is still in progress. ` +
          `Please wait for sdk.discoverWallets() to complete before accessing chain properties.`
        );
      }
      throw new Error(
        `Wallet "${walletId}" not found. Please ensure wallet discovery has completed. ` +
        `Make sure you call sdk.discoverWallets() and await it before accessing chain properties.`
      );
    }

    if (!walletInfo.providers?.ethereum) {
      throw new Error(
        `Selected wallet "${walletInfo.name}" does not support Ethereum. ` +
        `This wallet only supports: ${walletInfo.addressTypes.join(", ")}. ` +
        `Make sure your SDK config includes Ethereum in addressTypes.`
      );
    }
    return walletInfo.providers.ethereum;
  }

  private validateAndSelectWallet(requestedWalletId: string): void {
    if (!this.walletRegistry.has(requestedWalletId)) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "Unknown injected wallet id requested", {
        walletId: requestedWalletId,
      });
      throw new Error(`Unknown injected wallet id: ${requestedWalletId}`);
    }

    this.selectedWalletId = requestedWalletId;
    debug.log(DebugCategory.INJECTED_PROVIDER, "Selected injected wallet for connection", {
      walletId: requestedWalletId,
    });
  }

  private async connectToWallet(walletInfo: InjectedWalletInfo): Promise<WalletAddress[]> {
    if (!walletInfo.providers) {
      const error = new Error(`Wallet adapter not available for wallet: ${this.selectedWalletId}`);
      debug.error(DebugCategory.INJECTED_PROVIDER, "Wallet adapter not available", { walletId: this.selectedWalletId });
      this.emit("connect_error", {
        error: error.message,
        source: "manual-connect",
      });
      throw error;
    }

    debug.log(DebugCategory.INJECTED_PROVIDER, "Connecting via wallet", {
      walletId: this.selectedWalletId,
      walletName: walletInfo.name,
    });

    // Set up event listeners for wallet account changes (works for both Phantom and external wallets)
    this.setupExternalWalletEvents(walletInfo);
    
    // For Phantom, also set up browser-injected-sdk events
    // This needs to happen after selectedWalletId is set, so we do it here
    if (this.selectedWalletId === "phantom" && isPhantomWallet(walletInfo)) {
      // Clear any existing browser-injected-sdk cleanup functions before setting up new ones
      this.browserInjectedCleanupFunctions.forEach(cleanup => cleanup());
      this.browserInjectedCleanupFunctions = [];
      
      this.setupBrowserInjectedEvents();
      this.eventsInitialized = true;
    }

    const connectedAddresses: WalletAddress[] = [];

    if (this.addressTypes.includes(AddressType.solana) && walletInfo.providers?.solana) {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Attempting Solana connection", {
        walletId: this.selectedWalletId,
        walletName: walletInfo.name,
      });
      try {
        const result = await walletInfo.providers.solana.connect();
        const address = result.publicKey;
        
        connectedAddresses.push({
          addressType: AddressType.solana,
          address,
        });
        debug.info(DebugCategory.INJECTED_PROVIDER, "Solana connected successfully", {
          address,
          walletId: this.selectedWalletId,
          walletName: walletInfo.name,
        });
      } catch (err) {
        debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to connect Solana, stopping", {
          error: err,
          walletId: this.selectedWalletId,
          walletName: walletInfo.name,
        });
        this.emit("connect_error", {
          error: err instanceof Error ? err.message : "Failed to connect",
          source: "manual-connect",
        });
        throw err;
      }
    }

    if (this.addressTypes.includes(AddressType.ethereum) && walletInfo.providers?.ethereum) {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Attempting Ethereum connection", {
        walletId: this.selectedWalletId,
        walletName: walletInfo.name,
      });
      try {
        const accounts = await walletInfo.providers.ethereum.connect();
        
        if (accounts.length > 0) {
          connectedAddresses.push(
            ...accounts.map((address: string) => ({
              addressType: AddressType.ethereum,
              address,
            })),
          );
          debug.info(DebugCategory.INJECTED_PROVIDER, "Ethereum connected successfully", {
            addresses: accounts,
            walletId: this.selectedWalletId,
            walletName: walletInfo.name,
          });
        }
      } catch (err) {
        debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to connect Ethereum, stopping", {
          error: err,
          walletId: this.selectedWalletId,
          walletName: walletInfo.name,
        });
        this.emit("connect_error", {
          error: err instanceof Error ? err.message : "Failed to connect",
          source: "manual-connect",
        });
        throw err;
      }
    }

    return connectedAddresses;
  }

  private async finalizeConnection(connectedAddresses: WalletAddress[]): Promise<ConnectResult> {
    if (connectedAddresses.length === 0) {
      const error = new Error("Failed to connect to any supported wallet provider");
      this.emit("connect_error", {
        error: error.message,
        source: "manual-connect",
      });
      throw error;
    }

    // Update wallet registry state
    if (this.selectedWalletId) {
      this.walletRegistry.setWalletAddresses(this.selectedWalletId, connectedAddresses);
      this.walletRegistry.setWalletConnected(this.selectedWalletId, true);
    }

    debug.log(DebugCategory.INJECTED_PROVIDER, "Finalized connection with addresses", {
      addressCount: connectedAddresses.length,
      addresses: connectedAddresses.map(addr => ({ type: addr.addressType, address: addr.address.substring(0, 10) + "..." })),
    });

    const authUserId = await this.getAuthUserId("manual-connect");

    try {
      localStorage.setItem(WAS_CONNECTED_KEY, WAS_CONNECTED_VALUE);
      debug.log(DebugCategory.INJECTED_PROVIDER, "Set was-connected flag - auto-reconnect enabled");
      if (this.selectedWalletId) {
        localStorage.setItem(LAST_WALLET_ID_KEY, this.selectedWalletId);
        debug.log(DebugCategory.INJECTED_PROVIDER, "Stored last injected wallet id", {
          walletId: this.selectedWalletId,
        });
      }
    } catch (error) {
      // Ignore localStorage errors (e.g., in private browsing mode)
      debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to persist injected provider state", { error });
    }

    const result = {
      addresses: connectedAddresses,
      status: "completed" as const,
      authUserId,
    };

    this.emit("connect", {
      addresses: connectedAddresses,
      source: "manual-connect",
      authUserId,
    });

    return result;
  }

  async connect(authOptions: AuthOptions): Promise<ConnectResult> {
    debug.info(DebugCategory.INJECTED_PROVIDER, "Starting injected provider connect", {
      addressTypes: this.addressTypes,
      provider: authOptions.provider,
    });

    if (authOptions.provider !== "injected") {
      throw new Error(`Invalid provider for injected connection: ${authOptions.provider}. Must be "injected"`);
    }

    const requestedWalletId = authOptions.walletId || "phantom";
    this.validateAndSelectWallet(requestedWalletId);

    this.emit("connect_start", {
      source: "manual-connect",
      providerType: "injected",
    });

    try {
      if (!this.selectedWalletId) {
        throw new Error("No wallet selected");
      }

      const walletInfo = this.walletRegistry.getById(this.selectedWalletId);
      if (!walletInfo || !walletInfo.providers) {
        const error = new Error(`Wallet adapter not available for wallet: ${this.selectedWalletId}`);
        debug.error(DebugCategory.INJECTED_PROVIDER, "Wallet adapter not available", {
          walletId: this.selectedWalletId,
        });
        this.emit("connect_error", {
          error: error.message,
          source: "manual-connect",
        });
        throw error;
      }

      const connectedAddresses = await this.connectToWallet(walletInfo);

      return await this.finalizeConnection(connectedAddresses);
    } catch (error) {
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

    // Disconnect from the selected wallet's providers
    const walletInfo = this.walletRegistry.getById(this.selectedWalletId || "phantom");
    if (walletInfo?.providers) {
      if (this.addressTypes.includes(AddressType.solana) && walletInfo.providers.solana) {
        try {
          await walletInfo.providers.solana.disconnect();
          debug.log(DebugCategory.INJECTED_PROVIDER, "Solana disconnected successfully");
        } catch (err) {
          // Ignore errors if Solana wasn't connected
          debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to disconnect Solana", { error: err });
        }
      }

      if (this.addressTypes.includes(AddressType.ethereum) && walletInfo.providers.ethereum) {
        try {
          await walletInfo.providers.ethereum.disconnect();
          debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum disconnected successfully");
        } catch (err) {
          // Ignore errors if Ethereum wasn't connected
          debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to disconnect Ethereum", { error: err });
        }
      }
    }

    // Clean up browser-injected-sdk event listeners only
    // Do NOT clear this.eventListeners as it contains ProviderManager forwarding callbacks
    this.browserInjectedCleanupFunctions.forEach(cleanup => cleanup());
    this.browserInjectedCleanupFunctions = [];

    // Clear external wallet event listeners tracking
    if (this.selectedWalletId) {
      this.externalWalletEventListenersSetup.delete(this.selectedWalletId);
      // Update wallet registry state
      this.walletRegistry.setWalletConnected(this.selectedWalletId, false);
      this.walletRegistry.setWalletAddresses(this.selectedWalletId, []);
    }

    try {
      localStorage.removeItem(WAS_CONNECTED_KEY);
      debug.log(DebugCategory.INJECTED_PROVIDER, "Cleared was connected flag to prevent auto-reconnect");
    } catch (error) {
      debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to clear was-connected flag", { error });
    }

    this.emit("disconnect", {
      source: "manual-disconnect",
    });

    debug.info(DebugCategory.INJECTED_PROVIDER, "Injected provider disconnected successfully");
  }

  /**
   * Attempt auto-connection if user was previously connected
   * Only reconnects if the user connected before and didn't explicitly disconnect
   * Should be called after setting up event listeners
   */
  async autoConnect(): Promise<void> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Attempting auto-connect");

    let lastWalletId: string | null = null;
    try {
      const wasConnected = localStorage.getItem(WAS_CONNECTED_KEY);
      if (wasConnected !== WAS_CONNECTED_VALUE) {
        debug.log(DebugCategory.INJECTED_PROVIDER, "Skipping auto-connect: user was not previously connected");
        return; // Don't auto-connect if user never connected before
      }
      lastWalletId = localStorage.getItem(LAST_WALLET_ID_KEY);
      debug.log(DebugCategory.INJECTED_PROVIDER, "User was previously connected, attempting auto-connect", {
        lastWalletId: lastWalletId || "phantom",
      });
    } catch (error) {
      debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to check was-connected flag", { error });
      return; // Don't attempt autoconnect if we can't check the flag
    }

    this.emit("connect_start", {
      source: "auto-connect",
      providerType: "injected",
    });

    try {
      const walletId = lastWalletId || "phantom";

      // Wait for wallet discovery to complete before attempting to connect
      // This ensures Phantom and other wallets are registered in the registry
      await this.waitForWalletDiscovery(walletId);

      this.validateAndSelectWallet(walletId);

      if (!this.selectedWalletId) {
        debug.warn(DebugCategory.INJECTED_PROVIDER, "No wallet selected for auto-connect");
        return;
      }

      const walletInfo = this.walletRegistry.getById(this.selectedWalletId);
      if (!walletInfo || !walletInfo.providers) {
        debug.warn(DebugCategory.INJECTED_PROVIDER, "Wallet not available for auto-connect", {
          walletId: this.selectedWalletId,
        });
        return;
      }

      const connectedAddresses: WalletAddress[] = [];

      // Check if Phantom and verify extension is installed
      if (this.selectedWalletId === "phantom" && isPhantomWallet(walletInfo)) {
        const phantom = walletInfo.phantomInstance;
        if (!phantom?.extension?.isInstalled?.()) {
          debug.warn(DebugCategory.INJECTED_PROVIDER, "Phantom wallet extension not found for auto-connect");

          this.emit("connect_error", {
            error: "Phantom wallet not found",
            source: "auto-connect",
          });

          return;
        }

        // Try Solana auto-connect if enabled
        if (this.addressTypes.includes(AddressType.solana)) {
          debug.log(DebugCategory.INJECTED_PROVIDER, "Attempting Solana auto-connect");
          try {
            // Use onlyIfTrusted=true for silent connection
            const publicKeyResult = await phantom.solana.connect({ onlyIfTrusted: true });
            if (!publicKeyResult) {
              throw new Error("Failed to auto-connect to Solana wallet");
            }
            const publicKey = typeof publicKeyResult === "string" ? publicKeyResult : (publicKeyResult as unknown as { publicKey?: string })?.publicKey || "";
            if (publicKey) {
              connectedAddresses.push({
                addressType: AddressType.solana,
                address: publicKey,
              });
              debug.info(DebugCategory.INJECTED_PROVIDER, "Solana auto-connected successfully", { 
                address: publicKey 
              });
            }
          } catch (err) {
            debug.log(DebugCategory.INJECTED_PROVIDER, "Solana auto-connect failed (expected if not trusted)", {
              error: err,
            });
            throw err;
          }
        }

        // Try Ethereum auto-connect if enabled
        if (this.addressTypes.includes(AddressType.ethereum)) {
          debug.log(DebugCategory.INJECTED_PROVIDER, "Attempting Ethereum auto-connect");
          try {
            // Use onlyIfTrusted=true for silent connection (uses eth_accounts instead of eth_requestAccounts)
            const accounts = await phantom.ethereum.connect({ onlyIfTrusted: true });
            if (accounts && accounts.length > 0) {
              connectedAddresses.push(
                ...accounts.map((address: string) => ({
                  addressType: AddressType.ethereum,
                  address,
                })),
              );
              debug.info(DebugCategory.INJECTED_PROVIDER, "Ethereum auto-connected successfully", {
                addresses: accounts,
              });
            }
          } catch (err) {
            debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum auto-connect failed (expected if not trusted)", {
              error: err,
            });
          }
        }
      } else {
        // External wallet auto-connect logic
        debug.log(DebugCategory.INJECTED_PROVIDER, "Attempting auto-connect to external wallet", {
          walletId: this.selectedWalletId,
          walletName: walletInfo.name,
        });

        // Try Solana auto-connect if enabled
        if (this.addressTypes.includes(AddressType.solana) && walletInfo.providers.solana) {
          try {
            // For Wallet Standard, try to get accounts without prompting
            // Note: Wallet Standard doesn't have onlyIfTrusted, so we try connect() and catch if it fails
            const result: any = await walletInfo.providers.solana.connect();
            let address: string;

            if (result && typeof result === "object") {
              if ("publicKey" in result && !Array.isArray(result)) {
                address = result.publicKey;
              } else if (Array.isArray(result) && result.length > 0 && result[0]?.address) {
                address = result[0].address;
              } else {
                throw new Error("Invalid response from wallet connect");
              }
            } else {
              throw new Error("Invalid response from wallet connect");
            }

            if (address) {
              connectedAddresses.push({
                addressType: AddressType.solana,
                address,
              });
              debug.info(DebugCategory.INJECTED_PROVIDER, "Solana auto-connected successfully", {
                address,
                walletId: this.selectedWalletId,
                walletName: walletInfo.name,
              });
            }
          } catch (err) {
            debug.log(DebugCategory.INJECTED_PROVIDER, "Solana auto-connect failed (expected if not trusted)", {
              error: err,
              walletId: this.selectedWalletId,
            });
          }
        }

        // Try Ethereum auto-connect if enabled
        if (this.addressTypes.includes(AddressType.ethereum) && walletInfo.providers.ethereum) {
          try {
            // For EIP-6963, use eth_accounts instead of eth_requestAccounts for silent connection
            const accounts = await walletInfo.providers.ethereum.request({ method: "eth_accounts" });
            if (Array.isArray(accounts) && accounts.length > 0) {
              connectedAddresses.push(
                ...accounts.map((address: string) => ({
                  addressType: AddressType.ethereum,
                  address,
                })),
              );
              debug.info(DebugCategory.INJECTED_PROVIDER, "Ethereum auto-connected successfully", {
                addresses: accounts,
                walletId: this.selectedWalletId,
                walletName: walletInfo.name,
              });
            }
          } catch (err) {
            debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum auto-connect failed (expected if not trusted)", {
              error: err,
              walletId: this.selectedWalletId,
            });
          }
        }
      }

      if (connectedAddresses.length === 0) {
        debug.log(DebugCategory.INJECTED_PROVIDER, "Auto-connect failed: no trusted connections available");

        this.emit("connect_error", {
          error: "No trusted connections available",
          source: "auto-connect",
        });

        return;
      }

      // Update wallet registry state
      if (this.selectedWalletId) {
        this.walletRegistry.setWalletAddresses(this.selectedWalletId, connectedAddresses);
        this.walletRegistry.setWalletConnected(this.selectedWalletId, true);
      }

      const authUserId = await this.getAuthUserId("auto-connect");

      this.emit("connect", {
        addresses: connectedAddresses,
        source: "auto-connect",
        authUserId,
      });

      debug.info(DebugCategory.INJECTED_PROVIDER, "Auto-connect successful", {
        addressCount: connectedAddresses.length,
        addresses: connectedAddresses.map(addr => ({
          type: addr.addressType,
          address: addr.address.substring(0, 8) + "...",
        })),
        walletId: this.selectedWalletId,
        authUserId,
      });
    } catch (error) {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Auto-connect failed with error", {
        error: error instanceof Error ? error.message : String(error),
      });

      this.emit("connect_error", {
        error: error instanceof Error ? error.message : "Auto-connect failed",
        source: "auto-connect",
      });
    }
  }

  getAddresses(): WalletAddress[] {
    const walletId = this.selectedWalletId || "phantom";
    return this.walletRegistry.getWalletAddresses(walletId);
  }

  /**
   * Get enabled address types for the current selected wallet
   * - For Phantom: returns config.addressTypes
   * - For external wallets: returns the wallet's addressTypes from registry
   */
  getEnabledAddressTypes(): AddressType[] {
    // If Phantom is selected or no wallet is selected, use config.addressTypes
    if (!this.selectedWalletId || this.selectedWalletId === "phantom") {
      return this.addressTypes;
    }

    // For external wallets, get address types from registry
    const walletInfo = this.walletRegistry.getById(this.selectedWalletId);
    if (walletInfo) {
      return walletInfo.addressTypes;
    }

    // Fallback to config.addressTypes
    return this.addressTypes;
  }

  isConnected(): boolean {
    const walletId = this.selectedWalletId || "phantom";
    return this.walletRegistry.isWalletConnected(walletId);
  }

  // AutoConfirm methods - only available for Phantom wallet
  async enableAutoConfirm(params: AutoConfirmEnableParams): Promise<AutoConfirmResult> {
    const walletInfo = this.walletRegistry.getById(this.selectedWalletId || "phantom");
    if (!isPhantomWallet(walletInfo)) {
      throw new Error("Auto-confirm is only available for Phantom wallet");
    }
    debug.log(DebugCategory.INJECTED_PROVIDER, "Enabling autoConfirm", { params });
    return await walletInfo.phantomInstance.autoConfirm.autoConfirmEnable(params);
  }

  async disableAutoConfirm(): Promise<void> {
    const walletInfo = this.walletRegistry.getById(this.selectedWalletId || "phantom");
    if (!isPhantomWallet(walletInfo)) {
      throw new Error("Auto-confirm is only available for Phantom wallet");
    }
    debug.log(DebugCategory.INJECTED_PROVIDER, "Disabling autoConfirm");
    await walletInfo.phantomInstance.autoConfirm.autoConfirmDisable();
  }

  async getAutoConfirmStatus(): Promise<AutoConfirmResult> {
    const walletInfo = this.walletRegistry.getById(this.selectedWalletId || "phantom");
    if (!isPhantomWallet(walletInfo)) {
      throw new Error("Auto-confirm is only available for Phantom wallet");
    }
    debug.log(DebugCategory.INJECTED_PROVIDER, "Getting autoConfirm status");
    return await walletInfo.phantomInstance.autoConfirm.autoConfirmStatus();
  }

  async getSupportedAutoConfirmChains(): Promise<AutoConfirmSupportedChainsResult> {
    const walletInfo = this.walletRegistry.getById(this.selectedWalletId || "phantom");
    if (!isPhantomWallet(walletInfo)) {
      throw new Error("Auto-confirm is only available for Phantom wallet");
    }
    debug.log(DebugCategory.INJECTED_PROVIDER, "Getting supported autoConfirm chains");
    return await walletInfo.phantomInstance.autoConfirm.autoConfirmSupportedChains();
  }

  /**
   * Helper method to get authUserId from window.phantom.app.getUser()
   * Returns undefined if the method is not available or fails, or if wallet is not Phantom
   */
  private async getAuthUserId(context: string): Promise<string | undefined> {
    const walletInfo = this.walletRegistry.getById(this.selectedWalletId || "phantom");
    if (!isPhantomWallet(walletInfo)) {
      // Only Phantom supports authUserId
      return undefined;
    }
    try {
      if (window.phantom?.app?.getUser) {
        const userInfo = await window.phantom.app.getUser();
        const authUserId = userInfo?.authUserId;
        if (authUserId) {
          debug.log(
            DebugCategory.INJECTED_PROVIDER,
            `Retrieved authUserId from window.phantom.app.getUser() during ${context}`,
            {
              authUserId,
            },
          );
        }
        return authUserId;
      }
    } catch (error) {
      debug.log(
        DebugCategory.INJECTED_PROVIDER,
        `Failed to get user info during ${context} (method may not be supported)`,
        { error },
      );
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
    // Only set up browser-injected-sdk events when Phantom is selected
    const walletInfo = this.walletRegistry.getById(this.selectedWalletId || "phantom");
    if (!isPhantomWallet(walletInfo)) {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Skipping browser-injected-sdk event setup - not Phantom wallet");
      return;
    }

    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up browser-injected-sdk event listeners");

    // For Phantom, set up event listeners directly on the Phantom instance
    if (this.selectedWalletId === "phantom" && isPhantomWallet(walletInfo)) {
      if (this.addressTypes.includes(AddressType.solana)) {
        this.setupSolanaEvents(walletInfo.phantomInstance);
      }

      if (this.addressTypes.includes(AddressType.ethereum)) {
        this.setupEthereumEvents(walletInfo.phantomInstance);
      }
    }
  }

  private setupSolanaEvents(phantom: PhantomExtended): void {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up Solana event listeners");

    // Map Solana connect event to unified connect event
    const handleSolanaConnect = async (publicKey: string) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana connect event received", { publicKey });

      const walletId = this.selectedWalletId || "phantom";
      const addresses = this.walletRegistry.getWalletAddresses(walletId);
      const solanaAddress = { addressType: AddressType.solana, address: publicKey };
      const hasSolana = addresses.some(addr => addr.addressType === AddressType.solana);
      const newAddresses = hasSolana
        ? addresses.map(addr => addr.addressType === AddressType.solana ? solanaAddress : addr)
        : [...addresses, solanaAddress];
      
      this.walletRegistry.setWalletAddresses(walletId, newAddresses);
      this.walletRegistry.setWalletConnected(walletId, true);

      const authUserId = await this.getAuthUserId("Solana connect event");

      this.emit("connect", {
        addresses: newAddresses,
        source: "injected-extension",
        authUserId,
      });
    };

    // Map Solana disconnect event to unified disconnect event
    const handleSolanaDisconnect = () => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana disconnect event received");

      const walletId = this.selectedWalletId || "phantom";
      const addresses = this.walletRegistry.getWalletAddresses(walletId);
      const filteredAddresses = addresses.filter(addr => addr.addressType !== AddressType.solana);
      this.walletRegistry.setWalletAddresses(walletId, filteredAddresses);
      
      if (filteredAddresses.length === 0) {
        this.walletRegistry.setWalletConnected(walletId, false);
      }

      this.emit("disconnect", {
        source: "injected-extension",
      });
    };

    // Map Solana account changed to reconnect event
    const handleSolanaAccountChanged = async (publicKey: string) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana account changed event received", { publicKey });

      const walletId = this.selectedWalletId || "phantom";
      const addresses = this.walletRegistry.getWalletAddresses(walletId);
      const solanaIndex = addresses.findIndex(addr => addr.addressType === AddressType.solana);
      const newAddresses = solanaIndex >= 0
        ? addresses.map((addr, idx) => idx === solanaIndex ? { addressType: AddressType.solana, address: publicKey } : addr)
        : [...addresses, { addressType: AddressType.solana, address: publicKey }];
      
      this.walletRegistry.setWalletAddresses(walletId, newAddresses);

      const authUserId = await this.getAuthUserId("Solana account changed event");

      this.emit("connect", {
        addresses: newAddresses,
        source: "injected-extension-account-change",
        authUserId,
      });
    };

    const cleanupConnect = phantom.solana.addEventListener("connect", handleSolanaConnect);
    const cleanupDisconnect = phantom.solana.addEventListener("disconnect", handleSolanaDisconnect);
    const cleanupAccountChanged = phantom.solana.addEventListener("accountChanged", handleSolanaAccountChanged);

    this.browserInjectedCleanupFunctions.push(cleanupConnect, cleanupDisconnect, cleanupAccountChanged);
  }

  private setupEthereumEvents(phantom: PhantomExtended): void {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up Ethereum event listeners");

    const handleEthereumConnect = async (accounts: string[]) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum connect event received", { accounts });

      const walletId = this.selectedWalletId || "phantom";
      const addresses = this.walletRegistry.getWalletAddresses(walletId);
      const ethAddresses = accounts.map(address => ({ addressType: AddressType.ethereum, address }));
      const otherAddresses = addresses.filter(addr => addr.addressType !== AddressType.ethereum);
      const newAddresses = [...otherAddresses, ...ethAddresses];
      
      this.walletRegistry.setWalletAddresses(walletId, newAddresses);
      this.walletRegistry.setWalletConnected(walletId, true);

      const authUserId = await this.getAuthUserId("Ethereum connect event");

      this.emit("connect", {
        addresses: newAddresses,
        source: "injected-extension",
        authUserId,
      });
    };

    const handleEthereumDisconnect = () => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum disconnect event received");

      const walletId = this.selectedWalletId || "phantom";
      const addresses = this.walletRegistry.getWalletAddresses(walletId);
      const filteredAddresses = addresses.filter(addr => addr.addressType !== AddressType.ethereum);
      this.walletRegistry.setWalletAddresses(walletId, filteredAddresses);
      
      if (filteredAddresses.length === 0) {
        this.walletRegistry.setWalletConnected(walletId, false);
      }

      this.emit("disconnect", {
        source: "injected-extension",
      });
    };

    const handleEthereumAccountsChanged = async (accounts: string[]) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum accounts changed event received", { accounts });

      const walletId = this.selectedWalletId || "phantom";
      const addresses = this.walletRegistry.getWalletAddresses(walletId);
      const otherAddresses = addresses.filter(addr => addr.addressType !== AddressType.ethereum);

      if (accounts && accounts.length > 0) {
        // User switched to a connected account - add new addresses
        const ethAddresses = accounts.map(address => ({ addressType: AddressType.ethereum, address }));
        const newAddresses = [...otherAddresses, ...ethAddresses];
        this.walletRegistry.setWalletAddresses(walletId, newAddresses);

        const authUserId = await this.getAuthUserId("Ethereum accounts changed event");

        this.emit("connect", {
          addresses: newAddresses,
          source: "injected-extension-account-change",
          authUserId,
        });
      } else {
        // User switched to unconnected account - treat as disconnect
        this.walletRegistry.setWalletAddresses(walletId, otherAddresses);
        if (otherAddresses.length === 0) {
          this.walletRegistry.setWalletConnected(walletId, false);
        }

        this.emit("disconnect", {
          source: "injected-extension-account-change",
        });
      }
    };

    const cleanupConnect = phantom.ethereum.addEventListener("connect", handleEthereumConnect);
    const cleanupDisconnect = phantom.ethereum.addEventListener("disconnect", handleEthereumDisconnect);
    const cleanupAccountsChanged = phantom.ethereum.addEventListener(
      "accountsChanged",
      handleEthereumAccountsChanged,
    );

    this.browserInjectedCleanupFunctions.push(cleanupConnect, cleanupDisconnect, cleanupAccountsChanged);
  }

  private setupExternalWalletEvents(walletInfo: InjectedWalletInfo): void {
    // Skip Phantom - it uses setupBrowserInjectedEvents instead
    if (isPhantomWallet(walletInfo)) {
      return;
    }

    // Only set up listeners once per wallet
    if (!this.selectedWalletId || this.externalWalletEventListenersSetup.has(this.selectedWalletId)) {
      return;
    }

    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up external wallet event listeners", {
      walletId: this.selectedWalletId,
    });

    // Set up event listeners for external wallet account changes
    if (walletInfo.providers?.ethereum) {
      const handleExternalEthereumAccountsChanged = async (accounts: string[]) => {
        debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum accounts changed event received", {
          walletId: this.selectedWalletId,
          accounts,
        });

        const walletId = this.selectedWalletId!;
        const addresses = this.walletRegistry.getWalletAddresses(walletId);
        const otherAddresses = addresses.filter(addr => addr.addressType !== AddressType.ethereum);

        if (accounts && accounts.length > 0) {
          // Add only the current accounts (should typically be 1, but handle multiple)
          const ethAddresses = accounts.map(address => ({ addressType: AddressType.ethereum, address }));
          const newAddresses = [...otherAddresses, ...ethAddresses];
          this.walletRegistry.setWalletAddresses(walletId, newAddresses);

          debug.log(DebugCategory.INJECTED_PROVIDER, "Updated Ethereum addresses after account change", {
            walletId,
            oldCount: 0, // We filtered them out
            newCount: accounts.length,
            addresses: newAddresses.filter(addr => addr.addressType === AddressType.ethereum),
          });

          const authUserId = await this.getAuthUserId("External wallet Ethereum accounts changed event");

          this.emit("connect", {
            addresses: newAddresses,
            source: "external-wallet-account-change",
            authUserId,
          });
        } else {
          // User switched to unconnected account - treat as disconnect
          this.walletRegistry.setWalletAddresses(walletId, otherAddresses);
          if (otherAddresses.length === 0) {
            this.walletRegistry.setWalletConnected(walletId, false);
          }

          this.emit("disconnect", {
            source: "external-wallet-account-change",
          });
        }
      };

      // Listen to accountsChanged events from the external wallet's ethereum provider
      if (typeof walletInfo.providers.ethereum.on === "function") {
        walletInfo.providers.ethereum.on("accountsChanged", handleExternalEthereumAccountsChanged);
        // Store cleanup function
        this.browserInjectedCleanupFunctions.push(() => {
          if (typeof walletInfo.providers?.ethereum?.off === "function") {
            walletInfo.providers.ethereum.off("accountsChanged", handleExternalEthereumAccountsChanged);
          }
        });
      }
    }

    if (walletInfo.providers?.solana) {
      const handleExternalSolanaAccountChanged = async (publicKey: string) => {
        debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Solana account changed event received", {
          walletId: this.selectedWalletId,
          publicKey,
        });

        const walletId = this.selectedWalletId!;
        const addresses = this.walletRegistry.getWalletAddresses(walletId);
        const otherAddresses = addresses.filter(addr => addr.addressType !== AddressType.solana);

        if (publicKey) {
          const newAddresses = [...otherAddresses, { addressType: AddressType.solana, address: publicKey }];
          this.walletRegistry.setWalletAddresses(walletId, newAddresses);

          const authUserId = await this.getAuthUserId("External wallet Solana account changed event");

          this.emit("connect", {
            addresses: newAddresses,
            source: "external-wallet-account-change",
            authUserId,
          });
        } else {
          // Account disconnected
          this.walletRegistry.setWalletAddresses(walletId, otherAddresses);
          if (otherAddresses.length === 0) {
            this.walletRegistry.setWalletConnected(walletId, false);
          }

          this.emit("disconnect", {
            source: "external-wallet-account-change",
          });
        }
      };

      // Listen to accountChanged events from the external wallet's solana provider
      if (typeof walletInfo.providers.solana.on === "function") {
        walletInfo.providers.solana.on("accountChanged", handleExternalSolanaAccountChanged);
        // Store cleanup function
        this.browserInjectedCleanupFunctions.push(() => {
          if (typeof walletInfo.providers?.solana?.off === "function") {
            walletInfo.providers.solana.off("accountChanged", handleExternalSolanaAccountChanged);
          }
        });
      }
    }

    // Mark this wallet as having event listeners set up
    if (this.selectedWalletId) {
      this.externalWalletEventListenersSetup.add(this.selectedWalletId);
    }
  }
}
