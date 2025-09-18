import type {
  WalletAddress,
  ConnectResult,
  SignMessageParams,
  SignAndSendTransactionParams,
  SignMessageResult,
  SignedTransaction,
  AuthOptions,
  EmbeddedProviderConfig,
} from "@phantom/embedded-provider-core";
import type { ISolanaChain, IEthereumChain } from "@phantom/chain-interfaces";
import { AddressType } from "@phantom/client";

import type { DebugCallback, DebugLevel } from "./debug";
import type { InjectedProviderConfig } from "./providers/injected";

// Debug configuration - separate from SDK config to avoid unnecessary reinstantiation
export interface DebugConfig {
  enabled?: boolean;
  level?: DebugLevel;
  callback?: DebugCallback;
}

export type BrowserSDKConfig = Prettify<
  (ExtendedEmbeddedProviderConfig | ExtendedInjectedProviderConfig) & {
    autoConnect?: boolean;
  }
>;

// Improves display of a merged type on hover
type Prettify<T> = {
  [K in keyof T]: T[K];
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {};

interface ExtendedEmbeddedProviderConfig
  extends Omit<EmbeddedProviderConfig, "authOptions" | "apiBaseUrl" | "embeddedWalletType"> {
  providerType: "embedded";
  // Optional in the SDK
  apiBaseUrl?: string;
  embeddedWalletType?: "app-wallet" | "user-wallet";
  authOptions?: {
    authUrl?: string;
    redirectUrl?: string;
  };
}

interface ExtendedInjectedProviderConfig extends InjectedProviderConfig {
  providerType: "injected";
  // Omitted EmbeddedProviderConfig properties
  appId?: never;
  authOptions?: never;
  embeddedWalletType?: never;
}

// Re-export types from core for convenience
export type {
  WalletAddress,
  ConnectResult,
  SignMessageParams,
  SignAndSendTransactionParams,
  SignMessageResult,
  SignedTransaction,
  AuthOptions,
  DebugCallback,
  DebugLevel,
};

// Re-export enums from client for convenience
export { AddressType };

export interface Provider {
  connect(authOptions?: AuthOptions): Promise<ConnectResult>;
  disconnect(): Promise<void>;
  getAddresses(): WalletAddress[];
  isConnected(): boolean;
  autoConnect(): Promise<void>;

  // Chain access - providers expose their chains directly
  solana: ISolanaChain;
  ethereum: IEthereumChain;
}
