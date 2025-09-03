import { EventEmitter } from "eventemitter3";
import type { IEthereumChain, EthTransactionRequest } from "@phantom/chains";
import type { EmbeddedProvider } from "../embedded-provider";
import { NetworkId, chainIdToNetworkId, networkIdToChainId } from "@phantom/constants";

/**
 * Embedded Ethereum chain implementation that is EIP-1193 compliant
 */
export class EmbeddedEthereumChain implements IEthereumChain {
  private currentNetworkId: NetworkId = NetworkId.ETHEREUM_MAINNET;
  private _connected: boolean = false;
  private _accounts: string[] = [];
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(private provider: EmbeddedProvider) {
    this.setupEventListeners();
    this.syncInitialState();
  }

  // EIP-1193 compliant properties
  get connected(): boolean {
    return this._connected;
  }

  get chainId(): string {
    const chainId = networkIdToChainId(this.currentNetworkId) || 1;
    return `0x${chainId.toString(16)}`;
  }

  get accounts(): string[] {
    return this._accounts;
  }

  private ensureConnected(): void {
    if (!this.provider.isConnected()) {
      throw new Error("Ethereum chain not available. Ensure SDK is connected.");
    }
  }

  async request<T = any>(args: { method: string; params?: unknown[] }): Promise<T> {
    this.ensureConnected();
    return this.handleEmbeddedRequest(args);
  }

  // Connection methods
  connect(): Promise<string[]> {
    if (!this.provider.isConnected()) {
      throw new Error("Provider not connected. Call provider connect first.");
    }
    const addresses = this.provider.getAddresses();
    const ethAddresses = addresses.filter((a: any) => a.addressType === "Ethereum").map((a: any) => a.address);

    this.updateConnectionState(true, ethAddresses);
    return Promise.resolve(ethAddresses);
  }

  async disconnect(): Promise<void> {
    await this.provider.disconnect();
  }

  // Standard compliant methods (return raw values)
  async signPersonalMessage(message: string, address: string): Promise<string> {
    return await this.request<string>({
      method: "personal_sign",
      params: [message, address],
    });
  }

  async signTypedData(typedData: any, address: string): Promise<string> {
    return await this.request<string>({
      method: "eth_signTypedData_v4",
      params: [address, JSON.stringify(typedData)],
    });
  }

  async sendTransaction(transaction: EthTransactionRequest): Promise<string> {
    const result = await this.provider.signAndSendTransaction({
      transaction,
      networkId: this.currentNetworkId,
    });
    if (!result.hash) {
      // Throw error as we didn't submit the transaction
      throw new Error("Transaction not submitted");
    }
    return result.hash;
  }

  switchChain(chainId: number): Promise<void> {
    const networkId = chainIdToNetworkId(chainId);
    if (!networkId) {
      throw new Error(`Unsupported chainId: ${chainId}`);
    }
    this.currentNetworkId = networkId;
    this.eventEmitter.emit("chainChanged", `0x${chainId.toString(16)}`);
    return Promise.resolve();
  }

  getChainId(): Promise<number> {
    const chainId = networkIdToChainId(this.currentNetworkId);
    return Promise.resolve(chainId || 1); // Default to mainnet
  }

  async getAccounts(): Promise<string[]> {
    return this.request({ method: "eth_accounts" });
  }

  isConnected(): boolean {
    return this._connected && this.provider.isConnected();
  }

  private setupEventListeners(): void {
    // Listen to provider events and bridge to EIP-1193 events
    this.provider.on("connect", (data: any) => {
      const ethAddresses =
        data.addresses?.filter((addr: any) => addr.addressType === "Ethereum")?.map((addr: any) => addr.address) || [];

      if (ethAddresses.length > 0) {
        this.updateConnectionState(true, ethAddresses);
        this.eventEmitter.emit("connect", { chainId: this.chainId });
        this.eventEmitter.emit("accountsChanged", ethAddresses);
      }
    });

    this.provider.on("disconnect", () => {
      this.updateConnectionState(false, []);
      this.eventEmitter.emit("disconnect", { code: 4900, message: "Provider disconnected" });
      this.eventEmitter.emit("accountsChanged", []);
    });
  }

  private syncInitialState(): void {
    if (this.provider.isConnected()) {
      const addresses = this.provider.getAddresses();
      const ethAddresses = addresses.filter((a: any) => a.addressType === "Ethereum").map((a: any) => a.address);

      if (ethAddresses.length > 0) {
        this.updateConnectionState(true, ethAddresses);
      }
    }
  }

  private updateConnectionState(connected: boolean, accounts: string[]): void {
    this._connected = connected;
    this._accounts = accounts;
  }

  private async handleEmbeddedRequest<T>(args: { method: string; params?: unknown[] }): Promise<T> {
    // Convert Ethereum RPC calls to embedded provider API
    switch (args.method) {
      case "personal_sign": {
        const [message, _address] = args.params as [string, string];
        const result = await this.provider.signMessage({
          message,
          networkId: this.currentNetworkId,
        });
        return result.signature as T;
      }

      case "eth_signTypedData_v4": {
        const [_typedDataAddress, typedDataStr] = args.params as [string, string];
        const _typedData = JSON.parse(typedDataStr);
        const typedDataResult = await this.provider.signMessage({
          message: typedDataStr, // Pass the stringified typed data as message
          networkId: this.currentNetworkId,
        });
        return typedDataResult.signature as T;
      }

      case "eth_sendTransaction": {
        const [transaction] = args.params as [EthTransactionRequest];
        // If the transaction has a chainId, submit it to that NetworkId
        const networkIdFromTx = transaction.chainId
          ? chainIdToNetworkId(
              typeof transaction.chainId === "number" ? transaction.chainId : parseInt(transaction.chainId, 16),
            )
          : null;

        const sendResult = await this.provider.signAndSendTransaction({
          transaction,
          networkId: networkIdFromTx || this.currentNetworkId,
        });
        return sendResult.hash as T;
      }

      case "eth_accounts": {
        const addresses = this.provider.getAddresses();
        const ethAddr = addresses.find((a: any) => a.addressType === "Ethereum");
        return (ethAddr ? [ethAddr.address] : []) as T;
      }

      case "eth_chainId": {
        return `0x${(networkIdToChainId(this.currentNetworkId) || 1).toString(16)}` as T;
      }

      case "wallet_switchEthereumChain": {
        const [{ chainId }] = args.params as [{ chainId: string }];
        const numericChainId = parseInt(chainId, 16);
        await this.switchChain(numericChainId);
        return undefined as T;
      }

      default:
        throw new Error(`Embedded provider doesn't support method: ${args.method}`);
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
