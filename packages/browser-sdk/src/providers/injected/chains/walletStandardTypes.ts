/**
 * TypeScript interfaces for Wallet Standard events
 * Based on the official Wallet Standard spec:
 * https://github.com/wallet-standard/wallet-standard/blob/8418e7c5a152a4aa8c8c7f41c3e6c2c701ddf910/packages/core/features/src/events.ts
 */

/**
 * Wallet Standard account structure
 * Accounts are always objects with address and publicKey properties
 */
export interface WalletStandardAccount {
  readonly address: string;
  readonly publicKey: Uint8Array;
  readonly chains: readonly string[];
  readonly features: readonly string[];
}

/**
 * Properties of a Wallet that changed with their new values
 * Emitted by the Wallet Standard "change" event
 */
export interface StandardEventsChangeProperties {
  /**
   * Chains supported by the Wallet.
   * The Wallet should only define this field if the value of the property has changed.
   */
  readonly chains?: readonly string[];
  /**
   * Features supported by the Wallet.
   * The Wallet should only define this field if the value of the property has changed.
   */
  readonly features?: Record<string, unknown>;
  /**
   * Accounts that the app is authorized to use.
   * The Wallet should only define this field if the value of the property has changed.
   * The value must be the new value of the property.
   */
  readonly accounts?: readonly WalletStandardAccount[];
}

/**
 * Wallet Standard feature interfaces
 * Each feature represents a capability that a wallet can implement
 */
export interface StandardConnectFeature {
  readonly connect: () => Promise<readonly WalletStandardAccount[] | void>;
}

export interface StandardDisconnectFeature {
  readonly disconnect: () => Promise<void>;
}

export interface StandardEventsFeature {
  readonly on: (event: string, listener: (...args: any[]) => void) => void;
  readonly off: (event: string, listener: (...args: any[]) => void) => void;
}

export interface SolanaSignMessageFeature {
  readonly signMessage: (options: { message: Uint8Array; account: WalletStandardAccount }) => Promise<
    Array<{
      signedMessage: Uint8Array;
      signature: Uint8Array;
      account?: WalletStandardAccount;
    }>
  >;
}

export interface SolanaSignTransactionFeature {
  readonly signTransaction: (options: {
    transaction: Uint8Array;
    account: WalletStandardAccount;
  }) => Promise<Array<{ signedTransaction: Uint8Array }>>;
}

export interface SolanaSignAndSendTransactionFeature {
  readonly signAndSendTransaction: (options: {
    transaction: Uint8Array;
    account: WalletStandardAccount;
    chain: string;
  }) => Promise<Array<{ signature: Uint8Array }>>;
}

export interface WalletStandardFeatures {
  "standard:connect"?: StandardConnectFeature;
  "standard:disconnect"?: StandardDisconnectFeature;
  "standard:events"?: StandardEventsFeature;
  "solana:signMessage"?: SolanaSignMessageFeature;
  "solana:signTransaction"?: SolanaSignTransactionFeature;
  "solana:signAndSendTransaction"?: SolanaSignAndSendTransactionFeature;
  [key: string]: unknown; // Allow other features
}

export interface WalletStandardWallet {
  readonly name: string;
  readonly icon: string;
  readonly version: string;
  readonly chains: readonly string[];
  readonly features: WalletStandardFeatures;
  readonly accounts: readonly WalletStandardAccount[];
}
