import { EventEmitter } from "eventemitter3";
import type { IEthereumChain, EthTransactionRequest } from "@phantom/chain-interfaces";
import { debug, DebugCategory } from "../../../debug";

/**
 * Wrapper for external EIP-6963 Ethereum providers
 * Implements IEthereumChain interface with debug logging
 * Handles interface translation (e.g., signPersonalMessage -> request("personal_sign"))
 */
export class InjectedWalletEthereumChain implements IEthereumChain {
  private provider: IEthereumChain;
  private walletId: string;
  private walletName: string;
  private eventEmitter: EventEmitter = new EventEmitter();
  private _connected: boolean = false;
  private _chainId: string = "0x1";
  private _accounts: string[] = [];

  constructor(provider: IEthereumChain, walletId: string, walletName: string) {
    this.provider = provider;
    this.walletId = walletId;
    this.walletName = walletName;
    this.setupEventListeners();
  }

  get connected(): boolean {
    return this._connected;
  }

  get chainId(): string {
    return this._chainId;
  }

  get accounts(): string[] {
    return this._accounts;
  }

  async request<T = any>(args: { method: string; params?: unknown[] }): Promise<T> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum request", {
      walletId: this.walletId,
      walletName: this.walletName,
      method: args.method,
    });

    try {
      // For methods that require authorization, ensure we're connected first
      const requiresAuth = [
        "personal_sign",
        "eth_sign",
        "eth_signTypedData",
        "eth_signTypedData_v4",
        "eth_sendTransaction",
        "eth_signTransaction",
      ].includes(args.method);
      if (requiresAuth && (!this._connected || this._accounts.length === 0)) {
        debug.log(DebugCategory.INJECTED_PROVIDER, "Method requires authorization, ensuring connection", {
          walletId: this.walletId,
          walletName: this.walletName,
          method: args.method,
        });
        await this.connect();
      }

      const result = await this.provider.request<T>(args);
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum request success", {
        walletId: this.walletId,
        walletName: this.walletName,
        method: args.method,
      });
      return result;
    } catch (error: any) {
      // If we get 4100 (Unauthorized), try to re-authorize and retry
      if (error?.code === 4100) {
        debug.log(DebugCategory.INJECTED_PROVIDER, "Got 4100 Unauthorized, attempting to re-authorize", {
          walletId: this.walletId,
          walletName: this.walletName,
          method: args.method,
        });
        try {
          // Re-request authorization
          await this.provider.request<string[]>({ method: "eth_requestAccounts" });
          // Retry the original request
          const result = await this.provider.request<T>(args);
          debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum request success (after re-auth)", {
            walletId: this.walletId,
            walletName: this.walletName,
            method: args.method,
          });
          return result;
        } catch (retryError) {
          debug.error(DebugCategory.INJECTED_PROVIDER, "Failed after re-authorization", {
            walletId: this.walletId,
            walletName: this.walletName,
            method: args.method,
            error: retryError instanceof Error ? retryError.message : String(retryError),
          });
          throw retryError;
        }
      }
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum request failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        method: args.method,
        error: error instanceof Error ? error.message : String(error),
        errorCode: error?.code,
      });
      throw error;
    }
  }

  async connect(): Promise<string[]> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum connect", {
      walletId: this.walletId,
      walletName: this.walletName,
    });

    try {
      // Always use eth_requestAccounts to get fresh accounts (not cached)
      // This ensures we get the current active account from the wallet
      const accounts = await this.provider.request<string[]>({ method: "eth_requestAccounts" });
      this._connected = accounts.length > 0;
      this._accounts = accounts;
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum connected (via eth_requestAccounts)", {
        walletId: this.walletId,
        walletName: this.walletName,
        accountCount: accounts.length,
        accounts,
      });
      return accounts;
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum connect failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum disconnect", {
      walletId: this.walletId,
      walletName: this.walletName,
    });

    try {
      await this.provider.disconnect();
      this._connected = false;
      this._accounts = [];
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum disconnected", {
        walletId: this.walletId,
        walletName: this.walletName,
      });
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum disconnect failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async signPersonalMessage(message: string, address: string): Promise<string> {
    const messagePreview = message.length > 50 ? message.substring(0, 50) + "..." : message;

    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum signPersonalMessage", {
      walletId: this.walletId,
      walletName: this.walletName,
      messagePreview,
      messageLength: message.length,
      address,
    });

    try {
      // Ensure we're connected before signing
      // Check both our internal state and the underlying provider's state
      const providerConnected = (this.provider as any).isConnected?.() || (this.provider as any).connected || false;
      if (!this._connected || this._accounts.length === 0 || !providerConnected) {
        debug.log(DebugCategory.INJECTED_PROVIDER, "Not connected, attempting to connect before signing", {
          walletId: this.walletId,
          walletName: this.walletName,
          internalConnected: this._connected,
          accountsLength: this._accounts.length,
          providerConnected,
        });
        await this.connect();
      }

      // Verify the address is in the connected accounts (case-insensitive comparison)
      const normalizedAddress = address.toLowerCase();
      const normalizedAccounts = this._accounts.map(acc => acc.toLowerCase());
      if (!normalizedAccounts.includes(normalizedAddress)) {
        debug.warn(DebugCategory.INJECTED_PROVIDER, "Address not in connected accounts, refreshing connection", {
          walletId: this.walletId,
          walletName: this.walletName,
          requestedAddress: address,
          connectedAccounts: this._accounts,
        });
        // Refresh accounts
        const currentAccounts = await this.getAccounts();
        const normalizedCurrentAccounts = currentAccounts.map(acc => acc.toLowerCase());
        if (!normalizedCurrentAccounts.includes(normalizedAddress)) {
          throw new Error(`Address ${address} is not connected. Connected accounts: ${currentAccounts.join(", ")}`);
        }
        // Update internal state with refreshed accounts
        this._accounts = currentAccounts;
      }

      // Check if provider has direct method
      if (typeof this.provider.signPersonalMessage === "function") {
        const result = await this.provider.signPersonalMessage(message, address);
        debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum signPersonalMessage success", {
          walletId: this.walletId,
          walletName: this.walletName,
          signatureLength: result.length,
        });
        return result;
      }

      // Fallback to request() for EIP-6963 providers
      // According to EIP-1193, personal_sign expects [message, address]
      const result = await this.request<string>({
        method: "personal_sign",
        params: [message, address],
      });
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum signPersonalMessage success", {
        walletId: this.walletId,
        walletName: this.walletName,
        signatureLength: result.length,
      });
      return result;
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum signPersonalMessage failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
        errorCode: (error as any)?.code,
      });
      throw error;
    }
  }

  async signTypedData(typedData: any, address: string): Promise<string> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum signTypedData", {
      walletId: this.walletId,
      walletName: this.walletName,
      primaryType: typedData?.primaryType,
      address,
    });

    try {
      // Check if provider has direct method
      if (typeof this.provider.signTypedData === "function") {
        const result = await this.provider.signTypedData(typedData, address);
        debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum signTypedData success", {
          walletId: this.walletId,
          walletName: this.walletName,
          signatureLength: result.length,
        });
        return result;
      }
      // Fallback to request() for EIP-6963 providers
      const result = await this.request<string>({
        method: "eth_signTypedData_v4",
        params: [address, typedData],
      });
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum signTypedData success", {
        walletId: this.walletId,
        walletName: this.walletName,
        signatureLength: result.length,
      });
      return result;
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum signTypedData failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async signTransaction(transaction: EthTransactionRequest): Promise<string> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum signTransaction", {
      walletId: this.walletId,
      walletName: this.walletName,
      from: transaction.from,
      to: transaction.to,
    });

    try {
      // Check if provider has direct method
      if (typeof this.provider.signTransaction === "function") {
        const result = await this.provider.signTransaction(transaction);
        debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum signTransaction success", {
          walletId: this.walletId,
          walletName: this.walletName,
          signatureLength: result.length,
        });
        return result;
      }
      // Fallback to request() for EIP-6963 providers
      const result = await this.request<string>({
        method: "eth_signTransaction",
        params: [transaction],
      });
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum signTransaction success", {
        walletId: this.walletId,
        walletName: this.walletName,
        signatureLength: result.length,
      });
      return result;
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum signTransaction failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async sendTransaction(transaction: EthTransactionRequest): Promise<string> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum sendTransaction", {
      walletId: this.walletId,
      walletName: this.walletName,
      from: transaction.from,
      to: transaction.to,
      value: transaction.value,
    });

    try {
      // Check if provider has direct method
      if (typeof this.provider.sendTransaction === "function") {
        const result = await this.provider.sendTransaction(transaction);
        debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum sendTransaction success", {
          walletId: this.walletId,
          walletName: this.walletName,
          txHash: result,
        });
        return result;
      }
      // Fallback to request() for EIP-6963 providers
      const result = await this.request<string>({
        method: "eth_sendTransaction",
        params: [transaction],
      });
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum sendTransaction success", {
        walletId: this.walletId,
        walletName: this.walletName,
        txHash: result,
      });
      return result;
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum sendTransaction failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async switchChain(chainId: number | string): Promise<void> {
    debug.log(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum switchChain", {
      walletId: this.walletId,
      walletName: this.walletName,
      chainId,
    });

    try {
      // Convert chainId to hex string format expected by EIP-1193
      const hexChainId =
        typeof chainId === "string"
          ? chainId.toLowerCase().startsWith("0x")
            ? chainId
            : `0x${parseInt(chainId, 10).toString(16)}`
          : `0x${chainId.toString(16)}`;

      if (typeof this.provider.switchChain === "function") {
        await this.provider.switchChain(hexChainId);
      } else {
        // Fallback to request()
        await this.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId }] });
      }

      this._chainId = hexChainId;
      this.eventEmitter.emit("chainChanged", this._chainId);
      debug.info(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum switchChain success", {
        walletId: this.walletId,
        walletName: this.walletName,
        chainId: hexChainId,
      });
    } catch (error) {
      debug.error(DebugCategory.INJECTED_PROVIDER, "External wallet Ethereum switchChain failed", {
        walletId: this.walletId,
        walletName: this.walletName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getChainId(): Promise<number> {
    if (typeof this.provider.getChainId === "function") {
      const chainId = await this.provider.getChainId();
      this._chainId = `0x${chainId.toString(16)}`;
      return chainId;
    }
    // Fallback to request()
    const chainId = await this.request<string>({ method: "eth_chainId" });
    const parsed = parseInt(chainId, 16);
    this._chainId = chainId;
    return parsed;
  }

  async getAccounts(): Promise<string[]> {
    if (typeof this.provider.getAccounts === "function") {
      const accounts = await this.provider.getAccounts();
      this._accounts = accounts;
      return accounts;
    }
    // Fallback to request()
    const accounts = await this.request<string[]>({ method: "eth_accounts" });
    this._accounts = accounts;
    return accounts;
  }

  isConnected(): boolean {
    return this._connected;
  }

  private setupEventListeners(): void {
    if (typeof this.provider.on === "function") {
      this.provider.on("connect", (info: { chainId: string }) => {
        this._connected = true;
        this._chainId = info.chainId;
        this.eventEmitter.emit("connect", info);
      });

      this.provider.on("disconnect", (error: { code: number; message: string }) => {
        this._connected = false;
        this._accounts = [];
        this.eventEmitter.emit("disconnect", error);
        this.eventEmitter.emit("accountsChanged", []);
      });

      this.provider.on("accountsChanged", (accounts: string[]) => {
        this._accounts = accounts;
        this.eventEmitter.emit("accountsChanged", accounts);
      });

      this.provider.on("chainChanged", (chainId: string) => {
        this._chainId = chainId;
        this.eventEmitter.emit("chainChanged", chainId);
      });
    }
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
