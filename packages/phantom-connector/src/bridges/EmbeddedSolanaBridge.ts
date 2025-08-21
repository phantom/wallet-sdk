import type { SolanaProvider, EmbeddedProvider, WalletAddress } from '../types';
import type { NetworkId } from '@phantom/constants';
import { AddressType } from '@phantom/client';
import { PublicKey, type Transaction, type VersionedTransaction } from '@solana/web3.js';

export class EmbeddedSolanaBridge implements SolanaProvider {
  private embeddedProvider: EmbeddedProvider;
  private currentNetworkId: NetworkId;
  private eventTarget = new EventTarget();

  constructor(embeddedProvider: EmbeddedProvider, initialNetworkId: NetworkId) {
    this.embeddedProvider = embeddedProvider;
    this.currentNetworkId = initialNetworkId;
  }

  async connect(_options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: PublicKey }> {
    await this.embeddedProvider.connect();
    
    const solanaAddresses = this.embeddedProvider.getAddresses()
      .filter((addr: WalletAddress) => addr.addressType === AddressType.solana);
      
    if (!solanaAddresses[0]) {
      throw new Error('No Solana addresses available');
    }

    return { publicKey: new PublicKey(solanaAddresses[0].address) };
  }

  async disconnect(): Promise<void> {
    await this.embeddedProvider.disconnect();
  }

  async signMessage(message: Uint8Array, display?: 'utf8' | 'hex'): Promise<{ signature: Uint8Array }> {
    const messageStr = display === 'hex' 
      ? Buffer.from(message).toString('hex')
      : Buffer.from(message).toString('utf8');
      
    const result = await this.embeddedProvider.signMessage({
      message: messageStr,
      networkId: this.currentNetworkId,
    });

    return { 
      signature: new Uint8Array(Buffer.from(result.signature, 'base64')) 
    };
  }

  signTransaction<T extends Transaction | VersionedTransaction>(_transaction: T): Promise<T> {
    // For embedded wallets, we can only sign+send, not just sign
    // This is a limitation of the embedded model
    throw new Error('signTransaction not supported for embedded wallets - use signAndSendTransaction');
  }

  signAllTransactions<T extends Transaction | VersionedTransaction>(_transactions: T[]): Promise<T[]> {
    // Similar limitation
    throw new Error('signAllTransactions not supported for embedded wallets');
  }

  async signAndSendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<{ signature: string }> {
    const result = await this.embeddedProvider.signAndSendTransaction({
      transaction,
      networkId: this.currentNetworkId,
    });

    if (!result.hash) {
      throw new Error('Transaction failed - no hash returned');
    }

    return { signature: result.hash };
  }

  async switchNetwork(networkId: NetworkId): Promise<void> {
    if (!networkId.startsWith('solana:')) {
      throw new Error(`Invalid Solana network: ${networkId}`);
    }

    const _oldNetworkId = this.currentNetworkId;
    this.currentNetworkId = networkId;

    const event = new CustomEvent('networkChanged', { 
      detail: { networkId } 
    });
    this.eventTarget.dispatchEvent(event);

    // console.log(`Switched Solana network from ${oldNetworkId} to ${networkId}`);
  }

  // Standard properties
  get isPhantom() { return true; }
  
  get publicKey() {
    const solanaAddresses = this.embeddedProvider.getAddresses()
      .filter((addr: WalletAddress) => addr.addressType === AddressType.solana);
    return solanaAddresses[0] ? new PublicKey(solanaAddresses[0].address) : null;
  }
  
  get isConnected() { return this.embeddedProvider.isConnected(); }

  // Event handling
  on(event: string, listener: (...args: any[]) => void) {
    if (event === 'networkChanged') {
      this.eventTarget.addEventListener(event, (e: any) => listener(e.detail));
    }
  }
  
  off(event: string, listener: (...args: any[]) => void) {
    this.eventTarget.removeEventListener(event, listener);
  }
}