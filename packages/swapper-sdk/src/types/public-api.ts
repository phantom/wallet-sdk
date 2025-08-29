import type { NetworkId } from "@phantom/constants";

/**
 * Token type for swaps
 */
export type TokenType = "native" | "address";

/**
 * Token specification for swaps
 */
export interface Token {
  type: TokenType;
  address?: string; // Required only if type is "address"
  networkId: NetworkId;
}

/**
 * User address with network
 */
export interface UserAddress {
  address: string;
  networkId: NetworkId;
}

/**
 * Simplified quote request parameters
 */
export interface GetQuotesParams {
  sellToken: Token;
  buyToken: Token;
  sellAmount: string;
  from: UserAddress;
  to?: UserAddress; // Optional, for bridges

  // Optional parameters
  slippageTolerance?: number;
  priorityFee?: number;
  tipAmount?: number;
  exactOut?: boolean;
  autoSlippage?: boolean;
  isLedger?: boolean;
}