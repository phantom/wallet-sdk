// Provider
export { PhantomProvider, usePhantom } from "./PhantomProvider";
export type { PhantomProviderProps, PhantomSDKConfig, ConnectOptions } from "./PhantomProvider";

// Hooks
export * from "./hooks";

// Types
export * from "./types";

// Re-export useful types and utilities from browser-sdk
export { NetworkId, AddressType, DebugLevel, debug } from "@phantom/browser-sdk";
export type { DebugMessage } from "@phantom/browser-sdk";

// Re-export chain interfaces
export type { ISolanaChain, IEthereumChain, EthTransactionRequest } from "@phantom/chains";
