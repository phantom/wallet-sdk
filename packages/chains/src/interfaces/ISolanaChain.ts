import type { ParsedSignatureResult, ParsedTransactionResult } from '@phantom/parsers';

export interface ISolanaChain {
  /**
   * Sign a message with the connected Solana wallet
   */
  signMessage(message: string | Uint8Array): Promise<ParsedSignatureResult>;
  
  /**
   * Sign a transaction without sending it
   */
  signTransaction<T>(transaction: T): Promise<T>;
  
  /**
   * Sign and send a transaction to the network
   */
  signAndSendTransaction<T>(transaction: T): Promise<ParsedTransactionResult>;
  
  /**
   * Connect to the Solana wallet
   */
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: string }>;
  
  /**
   * Disconnect from the Solana wallet
   */
  disconnect(): Promise<void>;
  
  /**
   * Switch Solana network
   */
  switchNetwork(network: 'mainnet' | 'devnet'): Promise<void>;
  
  /**
   * Get the current public key
   */
  getPublicKey(): Promise<string | null>;
  
  /**
   * Check if connected to Solana wallet
   */
  isConnected(): boolean;
}