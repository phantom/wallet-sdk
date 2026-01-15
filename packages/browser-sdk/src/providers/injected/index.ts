import type { Provider, ConnectResult, WalletAddress, AuthOptions, AuthProviderType } from "../../types";
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
import {
  getWalletRegistry,
  type InjectedWalletRegistry,
  type InjectedWalletInfo,
  isPhantomWallet,
} from "../../wallets/registry";
import type { ISolanaChain, IEthereumChain } from "@phantom/chain-interfaces";

const WAS_CONNECTED_KEY = "phantom-injected-was-connected";
const WAS_CONNECTED_VALUE = "true";
const LAST_WALLET_ID_KEY = "phantom-injected-last-wallet-id";

export interface InjectedProviderConfig {
  addressTypes: AddressType[];
}

interface ConnectOptions {
  onlyIfTrusted?: boolean; // For Solana: use onlyIfTrusted flag
  silent?: boolean; // For Ethereum: use eth_accounts instead of eth_requestAccounts
  skipEventListeners?: boolean; // Don't set up event listeners (for autoConnect)
}

export class InjectedProvider implements Provider {
  private addressTypes: AddressType[];
  private walletRegistry: InjectedWalletRegistry;
  private selectedWalletId: string | null = null;

  private walletStates = new Map<string, { connected: boolean; addresses: WalletAddress[] }>();

  // Event management
  private eventListeners: Map<EmbeddedProviderEvent, Set<EventCallback>> = new Map();
  private eventsInitialized: boolean = false;
  private eventListenersSetup: Set<string> = new Set(); // Track walletId that have listeners set up
  private eventListenerCleanups: Map<string, (() => void)[]> = new Map(); // Store cleanups per walletId

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

  /**
   * Helper method to get a chain provider with consistent error handling
   */
  private getChainProvider<T extends ISolanaChain | IEthereumChain>(
    addressType: AddressType,
    providerKey: "solana" | "ethereum",
    chainName: string,
  ): T {
    if (!this.addressTypes.includes(addressType)) {
      throw new Error(`${chainName} not enabled for this provider`);
    }

    const walletId = this.selectedWalletId || "phantom";
    const walletInfo = this.walletRegistry.getById(walletId);

    if (!walletInfo) {
      // If wallet not found, it might still be discovering
      const registry = this.walletRegistry;
      if (registry.discoveryPromise) {
        throw new Error(
          `Wallet "${walletId}" not found. Wallet discovery is still in progress. ` +
            `Please wait for sdk.discoverWallets() to complete before accessing chain properties.`,
        );
      }
      throw new Error(
        `Wallet "${walletId}" not found. Please ensure wallet discovery has completed. ` +
          `Make sure you call sdk.discoverWallets() and await it before accessing chain properties.`,
      );
    }

    const provider = walletInfo.providers?.[providerKey];
    if (!provider) {
      throw new Error(
        `Selected wallet "${walletInfo.name}" does not support ${chainName}. ` +
          `This wallet only supports: ${walletInfo.addressTypes.join(", ")}. ` +
          `Make sure your SDK config includes ${chainName} in addressTypes.`,
      );
    }

    return provider as T;
  }

  get solana(): ISolanaChain {
    return this.getChainProvider<ISolanaChain>(AddressType.solana, "solana", "Solana");
  }

  /**
   * Access to Ethereum chain operations
   */
  get ethereum(): IEthereumChain {
    return this.getChainProvider<IEthereumChain>(AddressType.ethereum, "ethereum", "Ethereum");
  }

  private validateAndSelectWallet(requestedWalletId: string): InjectedWalletInfo {
    if (!this.walletRegistry.has(requestedWalletId)) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "Unknown injected wallet id requested", {
        walletId: requestedWalletId,
      });
      throw new Error(`Unknown injected wallet id: ${requestedWalletId}`);
    }

    const walletInfo = this.walletRegistry.getById(requestedWalletId);
    if (!walletInfo || !walletInfo.providers) {
      debug.warn(DebugCategory.INJECTED_PROVIDER, "Wallet not available for connection", {
        walletId: requestedWalletId,
      });
      throw new Error(`Wallet not available for connection: ${requestedWalletId}`);
    }

    // Good walletId
    this.selectedWalletId = requestedWalletId;
    debug.log(DebugCategory.INJECTED_PROVIDER, "Selected injected wallet for connection", {
      walletId: requestedWalletId,
    });

    return walletInfo;
  }

  private async connectToWallet(walletInfo: InjectedWalletInfo, options?: ConnectOptions): Promise<WalletAddress[]> {
    if (!walletInfo.providers) {
      const error = new Error(`Wallet adapter not available for wallet: ${this.selectedWalletId}`);
      debug.error(DebugCategory.INJECTED_PROVIDER, "Wallet adapter not available", { walletId: this.selectedWalletId });
      this.emit("connect_error", {
        error: error.message,
        source: options?.skipEventListeners ? "auto-connect" : "manual-connect",
      });
      throw error;
    }

    debug.log(DebugCategory.INJECTED_PROVIDER, "Connecting via wallet", {
      walletId: this.selectedWalletId,
      walletName: walletInfo.name,
      options,
    });

    // Set up event listeners only if not skipped (for autoConnect, we set them up after successful connection)
    if (!options?.skipEventListeners) {
      this.setupEventListeners(walletInfo);
    }

    const connectedAddresses: WalletAddress[] = [];

    if (this.addressTypes.includes(AddressType.solana) && walletInfo.providers?.solana) {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Attempting Solana connection", {
        walletId: this.selectedWalletId,
        walletName: walletInfo.name,
        onlyIfTrusted: options?.onlyIfTrusted,
      });
      try {
        const result = await walletInfo.providers.solana.connect(
          options?.onlyIfTrusted ? { onlyIfTrusted: true } : undefined,
        );
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
          source: options?.skipEventListeners ? "auto-connect" : "manual-connect",
        });
        throw err;
      }
    }

    if (this.addressTypes.includes(AddressType.ethereum) && walletInfo.providers?.ethereum) {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Attempting Ethereum connection", {
        walletId: this.selectedWalletId,
        walletName: walletInfo.name,
        silent: options?.silent,
      });
      try {
        let accounts: string[];
        if (options?.silent) {
          // For silent connection, use eth_accounts instead of eth_requestAccounts
          accounts = await walletInfo.providers.ethereum.request<string[]>({ method: "eth_accounts" });
        } else {
          accounts = await walletInfo.providers.ethereum.connect();
        }

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
          source: options?.skipEventListeners ? "auto-connect" : "manual-connect",
        });
        throw err;
      }
    }

    return connectedAddresses;
  }

  private async finalizeConnection(
    connectedAddresses: WalletAddress[],
    authProvider?: AuthProviderType,
    walletId?: string,
  ): Promise<ConnectResult> {
    if (connectedAddresses.length === 0) {
      const error = new Error("Failed to connect to any supported wallet provider");
      this.emit("connect_error", {
        error: error.message,
        source: "manual-connect",
      });
      throw error;
    }

    // Update wallet state
    if (this.selectedWalletId) {
      this.setWalletState(this.selectedWalletId, {
        connected: true,
        addresses: connectedAddresses,
      });
    }

    debug.log(DebugCategory.INJECTED_PROVIDER, "Finalized connection with addresses", {
      addressCount: connectedAddresses.length,
      addresses: connectedAddresses.map(addr => ({
        type: addr.addressType,
        address: addr.address.substring(0, 10) + "...",
      })),
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

    // Get wallet info if available (already includes discovery field from registry)
    // Omit providers field from wallet info in ConnectResult
    const walletInfo = walletId ? this.walletRegistry.getById(walletId) : undefined;
    const wallet = walletInfo
      ? {
          id: walletInfo.id,
          name: walletInfo.name,
          icon: walletInfo.icon,
          addressTypes: walletInfo.addressTypes,
          rdns: walletInfo.rdns,
          discovery: walletInfo.discovery,
        }
      : undefined;

    const result: ConnectResult = {
      addresses: connectedAddresses,
      status: "completed" as const,
      authUserId,
      authProvider,
      walletId,
      wallet,
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

    this.emit("connect_start", {
      source: "manual-connect",
      providerType: "injected",
    });

    try {
      const requestedWalletId = authOptions.walletId || "phantom";
      const walletInfo = this.validateAndSelectWallet(requestedWalletId);
      const connectedAddresses = await this.connectToWallet(walletInfo);
      return await this.finalizeConnection(connectedAddresses, "injected", this.selectedWalletId || undefined);
    } catch (error) {
      this.emit("connect_error", {
        error: error instanceof Error ? error.message : "Failed to connect",
        source: "manual-connect",
      });
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

    // Clean up event listeners
    // Do NOT clear this.eventListeners as it contains ProviderManager forwarding callbacks
    const walletId = this.selectedWalletId || "phantom";
    const cleanups = this.eventListenerCleanups.get(walletId);
    if (cleanups) {
      cleanups.forEach(cleanup => cleanup());
      this.eventListenerCleanups.delete(walletId);
    }
    this.eventListenersSetup.delete(walletId);

    // Update wallet state
    if (this.selectedWalletId) {
      this.setWalletState(this.selectedWalletId, {
        connected: false,
        addresses: [],
      });
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
      const walletInfo = this.validateAndSelectWallet(walletId);

      // Use connectToWallet with silent/trusted options
      // Errors are expected and handled gracefully (don't throw)
      let connectedAddresses: WalletAddress[] = [];
      try {
        connectedAddresses = await this.connectToWallet(walletInfo, {
          onlyIfTrusted: true,
          silent: true,
          skipEventListeners: true, // Set up listeners only if connection succeeds
        });
      } catch (err) {
        // Auto-connect failures are expected if wallet is not trusted
        debug.log(DebugCategory.INJECTED_PROVIDER, "Auto-connect failed (expected if not trusted)", {
          error: err,
          walletId: this.selectedWalletId,
        });
      }

      if (connectedAddresses.length === 0) {
        debug.log(DebugCategory.INJECTED_PROVIDER, "Auto-connect failed: no trusted connections available");

        this.emit("connect_error", {
          error: "No trusted connections available",
          source: "auto-connect",
        });

        return;
      }

      // Set up event listeners after successful connection
      this.setupEventListeners(walletInfo);

      // Update wallet state
      if (this.selectedWalletId) {
        this.setWalletState(this.selectedWalletId, {
          connected: true,
          addresses: connectedAddresses,
        });
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

  private getWalletState(walletId: string): { connected: boolean; addresses: WalletAddress[] } {
    if (!this.walletStates.has(walletId)) {
      this.walletStates.set(walletId, { connected: false, addresses: [] });
    }
    return this.walletStates.get(walletId)!;
  }

  private setWalletState(walletId: string, state: { connected: boolean; addresses: WalletAddress[] }): void {
    this.walletStates.set(walletId, state);
  }

  /**
   * Update wallet state with new addresses for a specific address type
   * Replaces all existing addresses of the given type with the new addresses
   * @param walletId - The wallet ID to update
   * @param newAddresses - Array of new addresses (strings) for the address type
   * @param addressType - The type of addresses being updated
   * @returns The updated addresses array
   */
  private updateWalletAddresses(walletId: string, newAddresses: string[], addressType: AddressType): WalletAddress[] {
    const state = this.getWalletState(walletId);
    const otherAddresses = state.addresses.filter(addr => addr.addressType !== addressType);
    const addressesOfType = newAddresses.map(address => ({ addressType, address }));
    const updatedAddresses = [...otherAddresses, ...addressesOfType];

    this.setWalletState(walletId, {
      connected: updatedAddresses.length > 0,
      addresses: updatedAddresses,
    });

    return updatedAddresses;
  }

  /**
   * Helper to construct account change source string
   */
  private getAccountChangeSource(source: string): string {
    return `${source}-account-change`;
  }

  /**
   * Create a handler for Solana connect events
   */
  private createSolanaConnectHandler(walletId: string, source: string) {
    return async (publicKey: string) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana connect event received", { publicKey, walletId });

      const newAddresses = this.updateWalletAddresses(walletId, [publicKey], AddressType.solana);

      const authUserId = await this.getAuthUserId("Solana connect event");

      this.emit("connect", {
        addresses: newAddresses,
        source,
        authUserId,
      });
    };
  }

  /**
   * Create a handler for Solana disconnect events
   */
  private createSolanaDisconnectHandler(walletId: string, source: string) {
    return () => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana disconnect event received", { walletId });

      const state = this.getWalletState(walletId);
      const filteredAddresses = state.addresses.filter(addr => addr.addressType !== AddressType.solana);

      this.setWalletState(walletId, {
        connected: filteredAddresses.length > 0,
        addresses: filteredAddresses,
      });

      this.emit("disconnect", {
        source,
      });
    };
  }

  /**
   * Create a handler for Solana account change events
   * Can receive string | null per Wallet Standard
   */
  private createSolanaAccountChangeHandler(walletId: string, source: string) {
    return async (publicKey: string | null) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Solana account changed event received", { publicKey, walletId });

      if (publicKey) {
        const newAddresses = this.updateWalletAddresses(walletId, [publicKey], AddressType.solana);

        const authUserId = await this.getAuthUserId("Solana account changed event");

        this.emit("connect", {
          addresses: newAddresses,
          source: this.getAccountChangeSource(source),
          authUserId,
        });
      } else {
        // Account disconnected
        const state = this.getWalletState(walletId);
        const otherAddresses = state.addresses.filter(addr => addr.addressType !== AddressType.solana);
        this.setWalletState(walletId, {
          connected: otherAddresses.length > 0,
          addresses: otherAddresses,
        });

        this.emit("disconnect", {
          source: this.getAccountChangeSource(source),
        });
      }
    };
  }

  /**
   * Create a handler for Ethereum connect events
   * EIP-1193 connect event receives { chainId: string }, but we need to get accounts separately
   */
  private createEthereumConnectHandler(walletId: string, source: string) {
    return async (connectInfo?: { chainId: string } | string[]) => {
      // Handle both EIP-1193 format ({ chainId }) and browser-injected-sdk format (accounts array)
      let accounts: string[] = [];
      if (Array.isArray(connectInfo)) {
        accounts = connectInfo;
      } else {
        // EIP-1193 format - need to get accounts from provider
        try {
          const walletInfo = this.walletRegistry.getById(walletId);
          if (walletInfo?.providers?.ethereum) {
            accounts = await walletInfo.providers.ethereum.getAccounts();
          }
        } catch (error) {
          debug.warn(DebugCategory.INJECTED_PROVIDER, "Failed to get accounts on connect", { error });
        }
      }

      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum connect event received", { accounts, walletId });

      if (accounts.length > 0) {
        const newAddresses = this.updateWalletAddresses(walletId, accounts, AddressType.ethereum);

        const authUserId = await this.getAuthUserId("Ethereum connect event");

        this.emit("connect", {
          addresses: newAddresses,
          source,
          authUserId,
        });
      }
    };
  }

  /**
   * Create a handler for Ethereum disconnect events
   */
  private createEthereumDisconnectHandler(walletId: string, source: string) {
    return () => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum disconnect event received", { walletId });

      const state = this.getWalletState(walletId);
      const filteredAddresses = state.addresses.filter(addr => addr.addressType !== AddressType.ethereum);

      this.setWalletState(walletId, {
        connected: filteredAddresses.length > 0,
        addresses: filteredAddresses,
      });

      this.emit("disconnect", {
        source,
      });
    };
  }

  /**
   * Create a handler for Ethereum account change events
   */
  private createEthereumAccountChangeHandler(walletId: string, source: string) {
    return async (accounts: string[]) => {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Ethereum accounts changed event received", { accounts, walletId });

      if (accounts && accounts.length > 0) {
        // User switched to a connected account - add new addresses
        const newAddresses = this.updateWalletAddresses(walletId, accounts, AddressType.ethereum);

        const authUserId = await this.getAuthUserId("Ethereum accounts changed event");

        this.emit("connect", {
          addresses: newAddresses,
          source: this.getAccountChangeSource(source),
          authUserId,
        });
      } else {
        // User switched to unconnected account - treat as disconnect
        const state = this.getWalletState(walletId);
        const otherAddresses = state.addresses.filter(addr => addr.addressType !== AddressType.ethereum);
        this.setWalletState(walletId, {
          connected: otherAddresses.length > 0,
          addresses: otherAddresses,
        });

        this.emit("disconnect", {
          source: this.getAccountChangeSource(source),
        });
      }
    };
  }

  getAddresses(): WalletAddress[] {
    const walletId = this.selectedWalletId || "phantom";
    return this.getWalletState(walletId).addresses;
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
    return this.getWalletState(walletId).connected;
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

    // Lazy-initialize events when first listener is added
    if (!this.eventsInitialized) {
      const walletId = this.selectedWalletId || "phantom";
      const walletInfo = this.walletRegistry.getById(walletId);
      if (walletInfo) {
        this.setupEventListeners(walletInfo);
      }
    }

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
  }

  off(event: EmbeddedProviderEvent, callback: EventCallback): void {
    debug.log(DebugCategory.INJECTED_PROVIDER, "Removing event listener", { event });

    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)?.delete(callback);
      if (this.eventListeners.get(event)?.size === 0) {
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

  /**
   * Set up Solana event listeners for any provider (Phantom or external)
   */
  private setupSolanaEventListeners(provider: ISolanaChain, walletId: string, source: string): void {
    if (typeof provider.on !== "function") return;

    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up Solana event listeners", { walletId, source });

    const handlers = {
      connect: this.createSolanaConnectHandler(walletId, source),
      disconnect: this.createSolanaDisconnectHandler(walletId, source),
      accountChanged: this.createSolanaAccountChangeHandler(walletId, source),
    };

    // Register listeners
    provider.on("connect", handlers.connect);
    provider.on("disconnect", handlers.disconnect);
    provider.on("accountChanged", handlers.accountChanged);

    // Store cleanups
    const cleanups: (() => void)[] = [];
    if (typeof provider.off === "function") {
      cleanups.push(
        () => provider.off("connect", handlers.connect),
        () => provider.off("disconnect", handlers.disconnect),
        () => provider.off("accountChanged", handlers.accountChanged),
      );
    }
    const existingCleanups = this.eventListenerCleanups.get(walletId) || [];
    this.eventListenerCleanups.set(walletId, [...existingCleanups, ...cleanups]);
  }

  /**
   * Set up Ethereum event listeners for any provider (Phantom or external)
   */
  private setupEthereumEventListeners(provider: IEthereumChain, walletId: string, source: string): void {
    if (typeof provider.on !== "function") return;

    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up Ethereum event listeners", { walletId, source });

    const handlers = {
      connect: this.createEthereumConnectHandler(walletId, source),
      disconnect: this.createEthereumDisconnectHandler(walletId, source),
      accountsChanged: this.createEthereumAccountChangeHandler(walletId, source),
    };

    // Register listeners
    provider.on("connect", handlers.connect);
    provider.on("disconnect", handlers.disconnect);
    provider.on("accountsChanged", handlers.accountsChanged);

    // Store cleanups
    const cleanups: (() => void)[] = [];
    if (typeof provider.off === "function") {
      cleanups.push(
        () => provider.off("connect", handlers.connect),
        () => provider.off("disconnect", handlers.disconnect),
        () => provider.off("accountsChanged", handlers.accountsChanged),
      );
    }
    const existingCleanups = this.eventListenerCleanups.get(walletId) || [];
    this.eventListenerCleanups.set(walletId, [...existingCleanups, ...cleanups]);
  }

  /**
   * Unified event listener setup for all wallet types (Phantom and external)
   */
  private setupEventListeners(walletInfo: InjectedWalletInfo): void {
    const walletId = this.selectedWalletId || "phantom";

    // Check if already set up (works for both Phantom and external)
    if (this.eventListenersSetup.has(walletId)) {
      debug.log(DebugCategory.INJECTED_PROVIDER, "Event listeners already set up for wallet", { walletId });
      return;
    }

    debug.log(DebugCategory.INJECTED_PROVIDER, "Setting up event listeners", { walletId });

    // Set up Solana events
    if (this.addressTypes.includes(AddressType.solana) && walletInfo.providers?.solana) {
      this.setupSolanaEventListeners(walletInfo.providers.solana, walletId, "wallet");
    }

    // Set up Ethereum events
    if (this.addressTypes.includes(AddressType.ethereum) && walletInfo.providers?.ethereum) {
      this.setupEthereumEventListeners(walletInfo.providers.ethereum, walletId, "wallet");
    }

    this.eventListenersSetup.add(walletId);
    this.eventsInitialized = true;
  }
}
