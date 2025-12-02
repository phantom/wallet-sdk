import { EventEmitter } from "eventemitter3";
import type { IEthereumChain, EthTransactionRequest } from "@phantom/chain-interfaces";
import type { Ethereum } from "@phantom/browser-injected-sdk/ethereum";
import type { Extension } from "@phantom/browser-injected-sdk";

interface PhantomExtended {
  extension: Extension;
  ethereum: Ethereum;
}

/**
 * Phantom Ethereum chain implementation that is EIP-1193 compliant
 * This wraps Phantom's Ethereum provider with event listeners and state management
 */
export class PhantomEthereumChain implements IEthereumChain {
  private phantom: PhantomExtended;
  private _chainId: string = "0x1";
  private _accounts: string[] = [];
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(phantom: PhantomExtended) {
    this.phantom = phantom;
    this.setupEventListeners();
  }

  // EIP-1193 compliant properties
  get connected(): boolean {
    return this._accounts.length > 0;
  }

  get chainId(): string {
    return this._chainId;
  }

  get accounts(): string[] {
    return this._accounts;
  }

  // EIP-1193 core method with eth_signTransaction support
  async request<T = any>(args: { method: string; params?: unknown[] }): Promise<T> {
    // Handle eth_signTransaction locally since the underlying provider might not support it
    if (args.method === "eth_signTransaction") {
      const [transaction] = args.params as [EthTransactionRequest];
      const result = await this.signTransaction(transaction);
      return result as T;
    }

    // Delegate to Phantom provider
    const phantomProvider = await this.phantom.ethereum.getProvider();
    return await phantomProvider.request(args);
  }

  // Connection methods
  async connect(): Promise<string[]> {
    const accounts = await this.phantom.ethereum.getAccounts();
    this._accounts = accounts;
    return accounts;
  }

  async disconnect(): Promise<void> {
    await this.phantom.ethereum.disconnect();
    this._accounts = [];
  }

  // Standard compliant methods (return raw values, not wrapped objects)
  async signPersonalMessage(message: string, address: string): Promise<string> {
    return await this.phantom.ethereum.signPersonalMessage(message, address);
  }

  async signTypedData(typedData: any, address: string): Promise<string> {
    return await this.phantom.ethereum.signTypedData(typedData, address);
  }

  async signTransaction(transaction: EthTransactionRequest): Promise<string> {
    return await this.phantom.ethereum.signTransaction(transaction);
  }

  async sendTransaction(transaction: EthTransactionRequest): Promise<string> {
    return await this.phantom.ethereum.sendTransaction(transaction);
  }

  async switchChain(chainId: number | string): Promise<void> {
    // Convert to hex string format if needed
    const hexChainId =
      typeof chainId === "string"
        ? chainId.toLowerCase().startsWith("0x")
          ? chainId
          : `0x${parseInt(chainId, 10).toString(16)}`
        : `0x${chainId.toString(16)}`;

    await this.phantom.ethereum.switchChain(hexChainId);
    this._chainId = hexChainId;
    this.eventEmitter.emit("chainChanged", this._chainId);
  }

  async getChainId(): Promise<number> {
    const chainId = await this.phantom.ethereum.getChainId();
    return parseInt(chainId, 16);
  }

  async getAccounts(): Promise<string[]> {
    return await this.phantom.ethereum.getAccounts();
  }

  isConnected(): boolean {
    return this.connected;
  }

  private setupEventListeners(): void {
    // Bridge phantom events to EIP-1193 standard events
    this.phantom.ethereum.addEventListener("connect", (accounts: string[]) => {
      this._accounts = accounts;
      this.eventEmitter.emit("connect", { chainId: this._chainId });
      this.eventEmitter.emit("accountsChanged", accounts);
    });

    this.phantom.ethereum.addEventListener("disconnect", () => {
      this._accounts = [];
      this.eventEmitter.emit("disconnect", { code: 4900, message: "Provider disconnected" });
      this.eventEmitter.emit("accountsChanged", []);
    });

    this.phantom.ethereum.addEventListener("accountsChanged", (accounts: string[]) => {
      this._accounts = accounts;
      this.eventEmitter.emit("accountsChanged", accounts);
    });

    this.phantom.ethereum.addEventListener("chainChanged", (chainId: string) => {
      this._chainId = chainId;
      this.eventEmitter.emit("chainChanged", chainId);
    });
  }

  // Event methods for interface compliance
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
