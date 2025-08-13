export interface SwapperCaip19 {
  chainId: string; // ChainID is now internal to constants package
  resourceType: "address" | "nativeToken";
  address?: string;
  slip44?: string;
}

// SwapType and FeeType are now exported from @phantom/constants