import type { ISolanaChain } from '@phantom/chains';
import type { EmbeddedProvider } from '../embedded-provider';
import { NetworkId } from '@phantom/constants';
import { parseSignMessageResponse, parseTransactionResponse } from '@phantom/parsers';
import type { ParsedSignatureResult, ParsedTransactionResult } from '@phantom/parsers';

/**
 * Embedded Solana chain implementation for React Native and web embedded providers
 */
export class EmbeddedSolanaChain implements ISolanaChain {
  constructor(private provider: EmbeddedProvider) {}

  private ensureConnected(): void {
    if (!this.provider.isConnected()) {
      throw new Error('Solana chain not available. Ensure SDK is connected.');
    }
  }

  async signMessage(message: string ): Promise<ParsedSignatureResult> {
    this.ensureConnected();
    const result = await this.provider.signMessage({
      message,
      networkId: NetworkId.SOLANA_MAINNET
    });
    return parseSignMessageResponse(result.signature, NetworkId.SOLANA_MAINNET);
  }

  signTransaction<T>(_transaction: T): Promise<T> {
    this.ensureConnected();
    // For embedded provider, we need to implement signing without sending
    // This might require a new method in the EmbeddedProvider
    throw new Error('signTransaction not yet implemented for embedded provider');
  }

  async signAndSendTransaction<T>(transaction: T): Promise<ParsedTransactionResult> {
    this.ensureConnected();
    const result = await this.provider.signAndSendTransaction({
      transaction,
      networkId: NetworkId.SOLANA_MAINNET
    });
    return parseTransactionResponse(result.rawTransaction, NetworkId.SOLANA_MAINNET, result.hash);
  }

  connect(_options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }> {
    // For embedded, connection is handled at SDK level
    const addresses = this.provider.getAddresses();
    const solanaAddr = addresses.find((a: any) => a.addressType === 'Solana');
    if (!solanaAddr) throw new Error('No Solana address found');
    return Promise.resolve({ publicKey: solanaAddr.address });
  }

  async disconnect(): Promise<void> {
    // For embedded, disconnection is handled at SDK level
    return this.provider.disconnect();
  }

  switchNetwork(_network: 'mainnet' | 'devnet'): Promise<void> {
    // Network switching not yet implemented for embedded provider
    return Promise.resolve();
  }

  getPublicKey(): Promise<string | null> {
    if (!this.provider.isConnected()) return Promise.resolve(null);
    
    const addresses = this.provider.getAddresses();
    const solanaAddr = addresses.find((a: any) => a.addressType === 'Solana');
    return Promise.resolve(solanaAddr?.address || null);
  }

  isConnected(): boolean {
    return this.provider.isConnected();
  }
}