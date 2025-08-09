import type { GetQuotesParams, Token, UserAddress } from "../types/public-api";
import type { SwapperCaip19, SwapperQuotesBody, SwapperInitializeRequestParams } from "../types";
import { ChainID, NATIVE_TOKEN_SLIP44, NATIVE_TOKEN_SLIP44_BY_CHAIN, NETWORK_TO_CHAIN_MAP, NetworkId } from "../types/networks";

/**
 * Convert a Token to SwapperCaip19 format
 */
export function tokenToSwapperCaip19(token: Token): SwapperCaip19 {
  const chainId = NETWORK_TO_CHAIN_MAP[token.networkId];
  
  if (!chainId) {
    throw new Error(`Unsupported network: ${token.networkId}`);
  }

  if (token.type === "native") {
    // Try to get chain-specific SLIP-44 first, then fallback to namespace
    let slip44 = NATIVE_TOKEN_SLIP44_BY_CHAIN[chainId];
    
    if (!slip44) {
      const namespace = chainId.split(":")[0];
      slip44 = NATIVE_TOKEN_SLIP44[namespace];
    }
    
    if (!slip44) {
      throw new Error(`No SLIP-44 code found for native token on chain ${chainId}`);
    }

    return {
      chainId,
      resourceType: "nativeToken",
      slip44,
    };
  } else {
    if (!token.address) {
      throw new Error("Token address is required when type is 'address'");
    }

    return {
      chainId,
      resourceType: "address",
      address: chainId.startsWith("eip155:") ? token.address.toLowerCase() : token.address,
    };
  }
}

/**
 * Convert a UserAddress to SwapperCaip19 format
 */
export function userAddressToSwapperCaip19(userAddress: UserAddress): SwapperCaip19 {
  const chainId = NETWORK_TO_CHAIN_MAP[userAddress.networkId];
  
  if (!chainId) {
    throw new Error(`Unsupported network: ${userAddress.networkId}`);
  }

  return {
    chainId,
    resourceType: "address",
    address: chainId.startsWith("eip155:") ? userAddress.address.toLowerCase() : userAddress.address,
  };
}

/**
 * Transform public API params to internal SwapperQuotesBody
 */
export function transformQuotesParams(params: GetQuotesParams): SwapperQuotesBody {
  const body: SwapperQuotesBody = {
    taker: userAddressToSwapperCaip19(params.from),
    buyToken: tokenToSwapperCaip19(params.buyToken),
    sellToken: tokenToSwapperCaip19(params.sellToken),
    sellAmount: params.sellAmount,
  };

  // Add optional destination for bridges
  if (params.to) {
    body.takerDestination = userAddressToSwapperCaip19(params.to);
  }

  // Add other optional parameters
  if (params.slippageTolerance !== undefined) {
    body.slippageTolerance = params.slippageTolerance;
  }
  if (params.priorityFee !== undefined) {
    body.priorityFee = params.priorityFee;
  }
  if (params.tipAmount !== undefined) {
    body.tipAmount = params.tipAmount;
  }
  if (params.exactOut !== undefined) {
    body.exactOut = params.exactOut;
  }
  if (params.autoSlippage !== undefined) {
    body.autoSlippage = params.autoSlippage;
  }
  if (params.isLedger !== undefined) {
    body.isLedger = params.isLedger;
  }

  return body;
}

/**
 * Transform initialize params - convert NetworkId to ChainID
 */
export function transformInitializeParams(params: SwapperInitializeRequestParams): SwapperInitializeRequestParams {
  const transformedParams = { ...params };
  
  // Convert network NetworkId to ChainID if present
  if (params.network) {
    const networkId = params.network as string;
    if (networkId in NETWORK_TO_CHAIN_MAP) {
      const chainId = NETWORK_TO_CHAIN_MAP[networkId as NetworkId];
      if (chainId) {
        transformedParams.network = chainId;
      }
    }
  }
  
  return transformedParams;
}