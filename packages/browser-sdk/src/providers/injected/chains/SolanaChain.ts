import type { ISolanaChain } from '@phantom/chains';
import { getExplorerUrl, NetworkId } from '@phantom/constants';
import type { ParsedSignatureResult, ParsedTransactionResult } from '@phantom/parsers';

/**
 * Injected Solana chain implementation that directly uses window.phantom.solana
 */
export class InjectedSolanaChain implements ISolanaChain {
  private get phantom() {
    if (typeof window === 'undefined' || !window.phantom?.solana) {
      throw new Error('Phantom Solana provider not found');
    }
    return window.phantom.solana;
  }

  async signMessage(message: string | Uint8Array): Promise<ParsedSignatureResult> {
    const result = await this.phantom.signMessage({ message });
    return {
      signature: result.signature,
      rawSignature: result.signature, // For injected provider, this is the raw response
      // No explorer URL for signatures
    };
  }

  async signTransaction<T>(transaction: T): Promise<T> {
    return await this.phantom.signTransaction(transaction);
  }

  async signAndSendTransaction<T>(transaction: T): Promise<ParsedTransactionResult> {
    const result = await this.phantom.signAndSendTransaction(transaction);
    return { 
      hash: result.signature, // For injected, signature IS the transaction hash
      rawTransaction: result.signature,
      blockExplorer: getExplorerUrl(NetworkId.SOLANA_MAINNET, 'transaction', result.signature)
    };
  }

  async connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }> {
    const result = await this.phantom.connect(options);
    return { publicKey: result.publicKey.toString() };
  }

  async disconnect(): Promise<void> {
    return await this.phantom.disconnect();
  }

  async switchNetwork(_network: 'mainnet' | 'devnet'): Promise<void> {
    // Note: Phantom may not have network switching yet - silent implementation
  }

  getPublicKey(): Promise<string | null> {
    try {
      const key = this.phantom.publicKey?.toString() || null;
      return Promise.resolve(key);
    } catch {
      return Promise.resolve(null);
    }
  }

  isConnected(): boolean {
    return this.phantom?.isConnected === true;
  }
}