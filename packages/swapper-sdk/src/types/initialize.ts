import type { ChainID } from "./chains";

export interface SwapperInitializeRequestParams {
  type: "buy" | "sell" | "swap";

  network?: ChainID;
  buyCaip19?: string;
  sellCaip19?: string;

  address?: string;
  addresses?: Record<ChainID, string>;
  cashAddress?: string;
  cashAddresses?: Record<ChainID, string>;
  takerCaip19?: string;
  takerDestinationCaip19?: string;
  settings?: SwapperSettings;
}

export interface SwapperSettings {
  priorityFee?: number;
  tip?: number;
}

export interface SwapperInitializeResults {
  buyToken?: FungibleMetadata;
  sellToken?: FungibleMetadata;
  buyTokenPrice?: SwapperPriceData;
  sellTokenPrice?: SwapperPriceData;
  maxSellAmount?: string;
}

export interface FungibleMetadata {
  address: string;
  chainId: ChainID;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
  coingeckoId?: string;
  isNative?: boolean;
}

export interface SwapperPriceData {
  usd?: number;
  usd_24h_change?: number;
  price?: number;
  priceChange24h?: number;
  currencyValue?: number;
  currencyChange?: number;
  lastUpdatedAt?: string;
}