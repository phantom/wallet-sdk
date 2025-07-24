import type { 
  BrowserSDKConfig, 
  ConnectResult, 
  SignedTransaction, 
  WalletAddress,
  Provider 
} from './types';
import { InjectedProvider } from './providers/injected';
import { EmbeddedProvider } from './providers/embedded';

export class BrowserSDK {
  private provider: Provider;
  private walletId: string | null = null;

  constructor(config: BrowserSDKConfig) {

    if (config.providerType === 'injected') {
      this.provider = new InjectedProvider();
    } else if (config.providerType === 'embedded') {
      if (!config.apiBaseUrl || !config.organizationId || !config.authUrl) {
        throw new Error('apiBaseUrl, organizationId, and authUrl are required for embedded provider');
      }

      this.provider = new EmbeddedProvider({
        apiBaseUrl: config.apiBaseUrl,
        organizationId: config.organizationId,
        authUrl: config.authUrl,
        embeddedWalletType: config.embeddedWalletType || 'app-wallet',
      });
    } else {
      throw new Error(`Invalid provider type: ${config.providerType}`);
    }
  }

  /**
   * Connect to the wallet
   */
  async connect(): Promise<ConnectResult> {
    const result = await this.provider.connect();
    this.walletId = result.walletId || null;
    return result;
  }

  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    await this.provider.disconnect();
    this.walletId = null;
  }

  /**
   * Sign a message
   * @param message - Base64url encoded message
   * @param networkId - Network identifier (e.g., 'solana:mainnet')
   * @returns Base64url encoded signature
   */
  async signMessage(message: string, networkId: string): Promise<string> {
    return this.provider.signMessage(this.walletId, {
      message,
      networkId: networkId as any,
    });
  }

  /**
   * Sign and send a transaction
   * @param transaction - Base64url encoded transaction
   * @param networkId - Network identifier (e.g., 'solana:mainnet')
   * @returns Transaction result
   */
  async signAndSendTransaction(transaction: string, networkId: string): Promise<SignedTransaction> {
    return this.provider.signAndSendTransaction(this.walletId, {
      transaction,
      networkId: networkId as any,
    });
  }

  /**
   * Get wallet addresses
   */
  async getAddresses(): Promise<WalletAddress[]> {
    return this.provider.getAddresses();
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.provider.isConnected();
  }

  /**
   * Get the current wallet ID (for embedded wallets)
   */
  getWalletId(): string | null {
    return this.walletId;
  }
}