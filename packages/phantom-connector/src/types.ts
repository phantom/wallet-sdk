import type { NetworkId } from '@phantom/constants';
import { AddressType } from '@phantom/client';
import type { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import type { ConnectResult, SignMessageParams as EmbeddedSignMessageParams, SignAndSendTransactionParams as EmbeddedSignAndSendTransactionParams, WalletAddress as EmbeddedWalletAddress } from '@phantom/embedded-provider-core';
import type { ParsedSignatureResult, ParsedTransactionResult } from '@phantom/parsers';

export interface EthereumProvider {
  // Standard EIP-1193 interface
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
  
  // Standard properties
  isPhantom: boolean;
  selectedAddress: string | null;
  chainId: string;
  isConnected: boolean;
}

export interface SolanaProvider {
  // Standard Solana provider interface
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array, display?: 'utf8' | 'hex'): Promise<{ signature: Uint8Array }>;
  signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
  signAndSendTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<{ signature: string }>;
  
  // Network switching (optional for injected providers)
  switchNetwork?(networkId: NetworkId): Promise<void>;
  
  // Event handling
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  
  // Standard properties
  isPhantom: boolean;
  publicKey: PublicKey | null;
  isConnected: boolean;
}

export interface ChainInfo {
  chainType: 'solana' | 'ethereum';
  networkId: NetworkId;
  chainId?: number; // For EVM chains
  name: string;
  isActive: boolean;
}

// Re-export embedded provider types
export type WalletAddress = EmbeddedWalletAddress;
export type SignMessageParams = EmbeddedSignMessageParams;
export type SignMessageResult = ParsedSignatureResult;
export type SignAndSendTransactionParams = EmbeddedSignAndSendTransactionParams;
export type SignAndSendTransactionResult = ParsedTransactionResult;

export interface EmbeddedProvider {
  // Connection methods
  connect(): Promise<ConnectResult>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Address management
  getAddresses(): WalletAddress[];
  
  // Signing methods
  signMessage(params: SignMessageParams): Promise<SignMessageResult>;
  signAndSendTransaction(params: SignAndSendTransactionParams): Promise<SignAndSendTransactionResult>;
}

// Injected Provider Extensions (for browser extension)
export interface InjectedProviderExtensions {
  getInjectedEthereumProvider(): EthereumProvider;
  getInjectedSolanaProvider(): SolanaProvider;
}