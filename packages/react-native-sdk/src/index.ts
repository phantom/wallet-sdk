// Main provider and context
export { PhantomProvider, usePhantom } from "./PhantomProvider";

// Individual hooks
export { useConnect, useDisconnect, useAccounts, useSignMessage, useSignAndSendTransaction } from "./hooks";

// Types
export type {
  PhantomSDKConfig,
  ConnectOptions,
  ConnectResult,
  WalletAddress,
  SignMessageParams,
  SignMessageResult,
  SignAndSendTransactionParams,
  SignedTransaction,
} from "./types";

export { AddressType } from "@phantom/client";
export { NetworkId } from "@phantom/constants";
