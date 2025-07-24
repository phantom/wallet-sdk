import type { Provider, ConnectResult, SignMessageParams, SignAndSendTransactionParams, SignedTransaction, WalletAddress } from '../../types';
import { base64urlDecode, base64urlDecodeToString, base64urlEncode } from '../../utils/base64url';
import { AddressType } from '@phantom/client';

declare global {
  interface Window {
    phantom?: {
      solana?: any;
      ethereum?: any;
    };
  }
}

export class InjectedProvider implements Provider {
  private connected: boolean = false;
  private addresses: WalletAddress[] = [];

  async connect(): Promise<ConnectResult> {
    if (!window.phantom) {
      throw new Error('Phantom wallet not found');
    }

    // Try Solana first
    if (window.phantom.solana) {
      try {
        const response = await window.phantom.solana.connect();
        const publicKey = response.publicKey.toString();
        
        this.addresses = [{
          addressType: AddressType.SOLANA,
          address: publicKey,
        }];
        this.connected = true;

        return {
          addresses: this.addresses,
        };
      } catch (err) {
        throw new Error(`Failed to connect to Solana wallet: ${err}`);
      }
    }

    // Try Ethereum
    if (window.phantom.ethereum) {
      try {
        const accounts = await window.phantom.ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        this.addresses = accounts.map((address: string) => ({
          addressType: AddressType.ETHEREUM,
          address,
        }));
        this.connected = true;

        return {
          addresses: this.addresses,
        };
      } catch (err) {
        throw new Error(`Failed to connect to Ethereum wallet: ${err}`);
      }
    }

    throw new Error('No supported wallet provider found');
  }

  async disconnect(): Promise<void> {
    if (window.phantom?.solana?.disconnect) {
      await window.phantom.solana.disconnect();
    }
    // Ethereum doesn't have a standard disconnect method
    this.connected = false;
    this.addresses = [];
  }

  async signMessage(_walletId: string | null, params: SignMessageParams): Promise<string> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const networkPrefix = params.networkId.split(':')[0].toLowerCase();

    if (networkPrefix === 'solana') {
      if (!window.phantom?.solana) {
        throw new Error('Solana provider not found');
      }

      // Decode base64url message
      const decodedMessage = base64urlDecodeToString(params.message);
      
      // Sign with Solana provider
      const { signature } = await window.phantom.solana.signMessage(
        new TextEncoder().encode(decodedMessage)
      );

      // Return base64url encoded signature
      return base64urlEncode(signature);
    } else if (networkPrefix === 'ethereum' || networkPrefix === 'polygon') {
      if (!window.phantom?.ethereum) {
        throw new Error('Ethereum provider not found');
      }

      // Decode base64url message
      const decodedMessage = base64urlDecodeToString(params.message);
      
      // Get the first address
      const address = this.addresses[0]?.address;
      if (!address) {
        throw new Error('No address available');
      }

      // Sign with Ethereum provider
      const signature = await window.phantom.ethereum.request({
        method: 'personal_sign',
        params: [decodedMessage, address],
      });

      // Convert hex signature to base64url
      const sigBytes = new Uint8Array(signature.slice(2).match(/.{2}/g).map((byte: string) => parseInt(byte, 16)));
      return base64urlEncode(sigBytes);
    }

    throw new Error(`Network ${params.networkId} is not supported for injected wallets`);
  }

  async signAndSendTransaction(_walletId: string | null, params: SignAndSendTransactionParams): Promise<SignedTransaction> {
    if (!this.connected) {
      throw new Error('Wallet not connected');
    }

    const networkPrefix = params.networkId.split(':')[0].toLowerCase();

    if (networkPrefix === 'solana') {
      if (!window.phantom?.solana) {
        throw new Error('Solana provider not found');
      }

      // Decode the base64url encoded transaction bytes
      const transactionBytes = base64urlDecode(params.transaction);
      
      let transaction: any;
      try {
        // First, try to deserialize as a VersionedTransaction from @solana/web3.js
        const { VersionedTransaction } = await import('@solana/web3.js');
        transaction = VersionedTransaction.deserialize(transactionBytes);
      } catch (versionedTxError) {
        // If that fails, create a transaction object for @solana/kit
        transaction = {
          messageBytes: transactionBytes,
          signatures: new Map(),
        };
      }
      
      // Send the transaction using the Solana provider
      const result = await window.phantom.solana.signAndSendTransaction(transaction);
      
      // Return in standard format
      return {
        rawTransaction: result.signature,
      };
    } else if (networkPrefix === 'ethereum' || networkPrefix === 'polygon') {
      if (!window.phantom?.ethereum) {
        throw new Error('Ethereum provider not found');
      }

      // Decode transaction
      const txBytes = base64urlDecode(params.transaction);
      const txHex = '0x' + Array.from(txBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      // Send transaction
      const txHash = await window.phantom.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txHex],
      });

      return {
        rawTransaction: txHash,
      };
    }

    throw new Error(`Network ${params.networkId} is not supported for injected wallets`);
  }

  async getAddresses(): Promise<WalletAddress[]> {
    return this.addresses;
  }

  isConnected(): boolean {
    return this.connected;
  }
}