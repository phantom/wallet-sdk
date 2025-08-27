import type { ISolanaChain } from '@phantom/chains';
import { getExplorerUrl, NetworkId } from '@phantom/constants';
import type { ParsedSignatureResult, ParsedTransactionResult } from '@phantom/parsers';
import type { Solana } from '@phantom/browser-injected-sdk/solana';
import type { Extension } from '@phantom/browser-injected-sdk';
import { Buffer } from 'buffer';

interface PhantomExtended {
  extension: Extension;
  solana: Solana;
}

/**
 * Injected Solana chain implementation that uses browser-injected-sdk
 */
export class InjectedSolanaChain implements ISolanaChain {
  private phantom: PhantomExtended;

  constructor(phantom: PhantomExtended) {
    this.phantom = phantom;
  }

  async signMessage(message: string | Uint8Array): Promise<ParsedSignatureResult> {
    const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
    const result = await this.phantom.solana.signMessage(messageBytes);

    // Convert Uint8Array signature to base58 string for consistency
    const signature = result.signature instanceof Uint8Array
      ? Buffer.from(result.signature).toString('base64')
      : result.signature;

    return {
      signature,
      rawSignature: signature,
    };
  }

  signTransaction<T>(_transaction: T): Promise<T> {
    // Note: browser-injected-sdk doesn't have signTransaction, only signAndSendTransaction
    // For now, throw an error - this may need to be implemented differently
    throw new Error('signTransaction not available in browser-injected-sdk, use signAndSendTransaction instead');
  }

  async signAndSendTransaction<T>(transaction: T): Promise<ParsedTransactionResult> {
    const result = await this.phantom.solana.signAndSendTransaction(transaction as any);
    return {
      hash: result.signature,
      rawTransaction: result.signature,
      blockExplorer: getExplorerUrl(NetworkId.SOLANA_MAINNET, 'transaction', result.signature)
    };
  }

  async connect(_options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }> {
    const address = await this.phantom.solana.connect();
    return { publicKey: address };
  }

  async disconnect(): Promise<void> {
    return await this.phantom.solana.disconnect();
  }

  async switchNetwork(_network: 'mainnet' | 'devnet'): Promise<void> {
    // Note: Phantom may not have network switching yet - silent implementation
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const address = await this.phantom.solana.getAccount();
      return address || null;
    } catch {
      return null;
    }
  }

  isConnected(): boolean {
    try {
      return !!this.phantom.extension?.isInstalled();
    } catch {
      return false;
    }
  }
}