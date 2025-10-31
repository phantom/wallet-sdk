import { EventEmitter } from "eventemitter3";
import type { IEthereumChain, EthTransactionRequest } from "@phantom/chain-interfaces";
import type { Ethereum } from "@phantom/browser-injected-sdk/ethereum";
import type { Extension } from "@phantom/browser-injected-sdk";
import { AddressType } from "@phantom/client";
import type { ChainCallbacks } from "./ChainCallbacks";

interface PhantomExtended {
  extension: Extension;
  ethereum: Ethereum;
}

/**
 * Injected Ethereum chain implementation that is EIP-1193 compliant
 */
export class InjectedEthereumChain implements IEthereumChain {
  private phantom: PhantomExtended;
  private callbacks: ChainCallbacks;
  private _connected: boolean = false;
  private _chainId: string = "0x1";
  private _accounts: string[] = [];
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(phantom: PhantomExtended, callbacks: ChainCallbacks) {
    this.phantom = phantom;
    this.callbacks = callbacks;
    this.setupEventListeners();
    this.syncInitialState();
  }

  // EIP-1193 compliant properties
  get connected(): boolean {
    return this._connected;
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

    // Delegate all other requests to the underlying provider
    const provider = await this.phantom.ethereum.getProvider();
    return await provider.request(args);
  }

  // Connection methods - delegate to provider
  connect(): Promise<string[]> {
    if (!this.callbacks.isConnected()) {
      return Promise.reject(new Error("Provider not connected. Call provider connect first."));
    }

    const addresses = this.callbacks.getAddresses();
    const ethAddresses = addresses.filter(addr => addr.addressType === AddressType.ethereum).map(addr => addr.address);

    this.updateConnectionState(true, ethAddresses);
    return Promise.resolve(ethAddresses);
  }

  async disconnect(): Promise<void> {
    await this.callbacks.disconnect();
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
    const hexChainId = typeof chainId === "string"
      ? chainId.toLowerCase().startsWith("0x") ? chainId : `0x${parseInt(chainId, 10).toString(16)}`
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
    return this._connected && this.callbacks.isConnected();
  }

  private setupEventListeners(): void {
    // Bridge phantom events to EIP-1193 standard events
    this.phantom.ethereum.addEventListener("connect", (accounts: string[]) => {
      this.updateConnectionState(true, accounts);
      this.eventEmitter.emit("connect", { chainId: this._chainId });
      this.eventEmitter.emit("accountsChanged", accounts);
    });

    this.phantom.ethereum.addEventListener("disconnect", () => {
      this.updateConnectionState(false, []);
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

    // Listen to SDK events via callbacks (no circular reference)
    this.callbacks.on("connect", data => {
      const ethAddresses =
        data.addresses
          ?.filter((addr: any) => addr.addressType === AddressType.ethereum)
          ?.map((addr: any) => addr.address) || [];

      if (ethAddresses.length > 0) {
        this.updateConnectionState(true, ethAddresses);
      }
    });

    this.callbacks.on("disconnect", () => {
      this.updateConnectionState(false, []);
    });
  }

  private syncInitialState(): void {
    // Sync initial state using callbacks
    if (this.callbacks.isConnected()) {
      const ethAddresses = this.callbacks
        .getAddresses()
        .filter(addr => addr.addressType === AddressType.ethereum)
        .map(addr => addr.address);

      if (ethAddresses.length > 0) {
        this.updateConnectionState(true, ethAddresses);
      }
    }
  }

  private updateConnectionState(connected: boolean, accounts: string[]): void {
    this._connected = connected;
    this._accounts = accounts;
  }

  // Event methods for interface compliance
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
