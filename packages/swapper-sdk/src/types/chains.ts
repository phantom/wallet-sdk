import type { ChainID } from "./networks";

export interface SwapperCaip19 {
  chainId: ChainID;
  resourceType: "address" | "nativeToken";
  address?: string;
  slip44?: string;
}

export enum SwapType {
  Solana = "solana",
  EVM = "eip155",
  XChain = "xchain",
  Sui = "sui",
}

export enum FeeType {
  NETWORK = "NETWORK",
  PROTOCOL = "PROTOCOL",
  PHANTOM = "PHANTOM",
  OTHER = "OTHER",
}