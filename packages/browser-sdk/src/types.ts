import type {
  WalletAddress,
  ConnectResult as EmbeddedConnectResult,
  SignMessageParams,
  SignAndSendTransactionParams,
  SignMessageResult,
  SignedTransaction,
  EmbeddedProviderConfig,
  EmbeddedProviderAuthType,
} from "@phantom/embedded-provider-core";
import type { ISolanaChain, IEthereumChain } from "@phantom/chain-interfaces";
import { AddressType } from "@phantom/client";

import type { DebugCallback, DebugLevel } from "./debug";
import type { InjectedProviderConfig } from "./providers/injected";
import type { InjectedWalletInfo } from "./wallets/registry";

// Debug configuration - separate from SDK config to avoid unnecessary reinstantiation
export interface DebugConfig {
  enabled?: boolean;
  level?: DebugLevel;
  callback?: DebugCallback;
}

export type BrowserSDKConfig = Prettify<
  Omit<EmbeddedProviderConfig, "authOptions" | "apiBaseUrl" | "embeddedWalletType" | "appId"> &
    InjectedProviderConfig & {
      // List of allowed authentication providers (REQUIRED)
      providers: AuthProviderType[];

      // Optional configuration - appId is required when using embedded providers (google, apple, phantom, etc.)
      appId?: string;
      apiBaseUrl?: string;
      embeddedWalletType?: "app-wallet" | "user-wallet";
      authOptions?: {
        authUrl?: string;
        redirectUrl?: string;
      };
    }
>;

// Improves display of a merged type on hover
type Prettify<T> = {
  [K in keyof T]: T[K];
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {};

type AuthProviderType = EmbeddedProviderAuthType | "injected" | "deeplink";

type AuthOptions = {
  provider: AuthProviderType;
  walletId?: string;
  customAuthData?: Record<string, any>;
};

// Re-export types from core for convenience
export type {
  WalletAddress,
  ConnectResult,
  SignMessageParams,
  SignAndSendTransactionParams,
  SignMessageResult,
  SignedTransaction,
  AuthOptions,
  AuthProviderType,
  DebugCallback,
  DebugLevel,
};

// Re-export enums from client for convenience
export { AddressType };

type ConnectResultWalletInfo = Omit<InjectedWalletInfo, "providers">;

type ConnectResult = Omit<EmbeddedConnectResult, "authProvider"> & {
  authProvider?: AuthProviderType | undefined;
  walletId?: string | undefined;
  wallet?: ConnectResultWalletInfo | undefined; // Wallet info (only for injected provider, without providers)
};

export interface Provider {
  connect(authOptions: AuthOptions): Promise<ConnectResult>;
  disconnect(): Promise<void>;
  getAddresses(): WalletAddress[];
  isConnected(): boolean;
  autoConnect(): Promise<void>;
  getEnabledAddressTypes(): AddressType[];

  // Chain access - providers expose their chains directly
  solana: ISolanaChain;
  ethereum: IEthereumChain;
}
