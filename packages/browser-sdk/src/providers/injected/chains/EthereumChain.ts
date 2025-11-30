import { EventEmitter } from "eventemitter3";
import type { IEthereumChain, EthTransactionRequest } from "@phantom/chain-interfaces";
import type { Ethereum } from "@phantom/browser-injected-sdk/ethereum";
import type { Extension } from "@phantom/browser-injected-sdk";
import { AddressType } from "@phantom/client";
import type { InjectedWalletRegistry } from "../../../wallets/registry";

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
  private walletId: string;
  private walletRegistry: InjectedWalletRegistry;
  private _chainId: string = "0x1";
  private _accounts: string[] = [];
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(phantom: PhantomExtended, walletId: string, walletRegistry: InjectedWalletRegistry) {
    this.phantom = phantom;
    this.walletId = walletId;
    this.walletRegistry = walletRegistry;
    this.setupEventListeners();
    this.syncInitialState();
  }

  // EIP-1193 compliant properties
  get connected(): boolean {
    return this.walletRegistry.isWalletConnected(this.walletId);
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
    
    // Update wallet registry state
    const addresses = this.walletRegistry.getWalletAddresses(this.walletId);
    const newEthAddresses = accounts.map(addr => ({ addressType: AddressType.ethereum, address: addr }));
    const otherAddresses = addresses.filter(addr => addr.addressType !== AddressType.ethereum);
    
    this.walletRegistry.setWalletAddresses(this.walletId, [...otherAddresses, ...newEthAddresses]);
    this.walletRegistry.setWalletConnected(this.walletId, true);
    this._accounts = accounts;
    
    return accounts;
  }

  async disconnect(): Promise<void> {
    // For multi-chain wallets (Phantom), disconnect all chains
    const wallet = this.walletRegistry.getById(this.walletId);
    if (wallet && wallet.addressTypes.length > 1) {
      // Clear all addresses for multi-chain wallet
      this.walletRegistry.setWalletAddresses(this.walletId, []);
    } else {
      // For single-chain wallets, only clear Ethereum addresses
      const addresses = this.walletRegistry.getWalletAddresses(this.walletId);
      const filteredAddresses = addresses.filter(addr => addr.addressType !== AddressType.ethereum);
      this.walletRegistry.setWalletAddresses(this.walletId, filteredAddresses);
    }
    
    await this.phantom.ethereum.disconnect();
    this.walletRegistry.setWalletConnected(this.walletId, false);
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
    return this.walletRegistry.isWalletConnected(this.walletId);
  }

  private setupEventListeners(): void {
    // Bridge phantom events to EIP-1193 standard events
    this.phantom.ethereum.addEventListener("connect", (accounts: string[]) => {
      this._accounts = accounts;
      const addresses = this.walletRegistry.getWalletAddresses(this.walletId);
      const ethAddresses = accounts.map(addr => ({ addressType: AddressType.ethereum, address: addr }));
      const otherAddresses = addresses.filter(addr => addr.addressType !== AddressType.ethereum);
      
      this.walletRegistry.setWalletAddresses(this.walletId, [...otherAddresses, ...ethAddresses]);
      this.walletRegistry.setWalletConnected(this.walletId, true);
      this.eventEmitter.emit("connect", { chainId: this._chainId });
      this.eventEmitter.emit("accountsChanged", accounts);
    });

    this.phantom.ethereum.addEventListener("disconnect", () => {
      const addresses = this.walletRegistry.getWalletAddresses(this.walletId);
      const filteredAddresses = addresses.filter(addr => addr.addressType !== AddressType.ethereum);
      this.walletRegistry.setWalletAddresses(this.walletId, filteredAddresses);
      
      // If no addresses left, mark as disconnected
      if (filteredAddresses.length === 0) {
        this.walletRegistry.setWalletConnected(this.walletId, false);
      }
      
      this._accounts = [];
      this.eventEmitter.emit("disconnect", { code: 4900, message: "Provider disconnected" });
      this.eventEmitter.emit("accountsChanged", []);
    });

    this.phantom.ethereum.addEventListener("accountsChanged", (accounts: string[]) => {
      this._accounts = accounts;
      const addresses = this.walletRegistry.getWalletAddresses(this.walletId);
      const ethAddresses = accounts.map(addr => ({ addressType: AddressType.ethereum, address: addr }));
      const otherAddresses = addresses.filter(addr => addr.addressType !== AddressType.ethereum);
      
      this.walletRegistry.setWalletAddresses(this.walletId, [...otherAddresses, ...ethAddresses]);
      this.eventEmitter.emit("accountsChanged", accounts);
    });

    this.phantom.ethereum.addEventListener("chainChanged", (chainId: string) => {
      this._chainId = chainId;
      this.eventEmitter.emit("chainChanged", chainId);
    });
  }

  private syncInitialState(): void {
    if (this.walletRegistry.isWalletConnected(this.walletId)) {
      const addresses = this.walletRegistry.getWalletAddresses(this.walletId);
      const ethAddresses = addresses
        .filter(addr => addr.addressType === AddressType.ethereum)
        .map(addr => addr.address);

      if (ethAddresses.length > 0) {
        this._accounts = ethAddresses;
      }
    }
  }

  // Event methods for interface compliance
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
