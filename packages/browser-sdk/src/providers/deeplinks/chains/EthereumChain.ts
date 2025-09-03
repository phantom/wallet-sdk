import type { IEthereumChain, EthTransactionRequest } from "@phantom/chains";

export class DeeplinksEthereumChain implements IEthereumChain {
  private eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor(
    // private _session: DeeplinksSession,
    // private _communicator: DeeplinksCommunicator,
  ) {}

  // EIP-1193 required properties
  get connected(): boolean {
    return false; // Ethereum deeplinks are not yet supported
  }

  get chainId(): string {
    return "0x1"; // Default to mainnet
  }

  get accounts(): string[] {
    return []; // No accounts available via deeplinks yet
  }

  // EIP-1193 core method
  request<T = any>(_args: { method: string; params?: unknown[] }): Promise<T> {
    return Promise.reject(new Error("Ethereum deeplinks are not yet supported by Phantom"));
  }

  // Connection methods
  connect(): Promise<string[]> {
    return Promise.reject(new Error("Ethereum deeplinks are not yet supported by Phantom"));
  }

  disconnect(): Promise<void> {
    return Promise.reject(new Error("Ethereum deeplinks are not yet supported by Phantom"));
  }

  // Convenience methods
  signPersonalMessage(_message: string, _address: string): Promise<string> {
    return Promise.reject(new Error("Ethereum deeplinks are not yet supported by Phantom"));
  }

  signTypedData(_typedData: any, _address: string): Promise<string> {
    return Promise.reject(new Error("Ethereum deeplinks are not yet supported by Phantom"));
  }

  sendTransaction(_transaction: EthTransactionRequest): Promise<string> {
    return Promise.reject(new Error("Ethereum deeplinks are not yet supported by Phantom"));
  }

  switchChain(_chainId: number): Promise<void> {
    return Promise.reject(new Error("Ethereum deeplinks are not yet supported by Phantom"));
  }

  getChainId(): Promise<number> {
    return Promise.resolve(1); // Mainnet
  }

  getAccounts(): Promise<string[]> {
    return Promise.resolve([]);
  }

  isConnected(): boolean {
    return false;
  }

  // Event methods
  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }
}