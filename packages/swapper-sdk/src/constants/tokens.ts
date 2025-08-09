import { NetworkId } from "../types/networks";
import type { Token } from "../types/public-api";

/**
 * Token constants for easy reference in swaps and bridges
 * Use these predefined tokens instead of manually constructing token objects
 */

// Ethereum Mainnet Tokens
export const ETHEREUM_MAINNET = {
  ETH: {
    type: "native" as const,
    networkId: NetworkId.ETHEREUM_MAINNET,
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  USDC: {
    type: "address" as const,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    networkId: NetworkId.ETHEREUM_MAINNET,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  USDT: {
    type: "address" as const,
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    networkId: NetworkId.ETHEREUM_MAINNET,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  WETH: {
    type: "address" as const,
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    networkId: NetworkId.ETHEREUM_MAINNET,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
  } satisfies Token & { symbol: string; name: string; decimals: number },
};

// Base Mainnet Tokens
export const BASE_MAINNET = {
  ETH: {
    type: "native" as const,
    networkId: NetworkId.BASE_MAINNET,
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  USDC: {
    type: "address" as const,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    networkId: NetworkId.BASE_MAINNET,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  WETH: {
    type: "address" as const,
    address: "0x4200000000000000000000000000000000000006",
    networkId: NetworkId.BASE_MAINNET,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
  } satisfies Token & { symbol: string; name: string; decimals: number },
};

// Polygon Mainnet Tokens
export const POLYGON_MAINNET = {
  MATIC: {
    type: "native" as const,
    networkId: NetworkId.POLYGON_MAINNET,
    symbol: "MATIC",
    name: "Polygon",
    decimals: 18,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  USDC: {
    type: "address" as const,
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    networkId: NetworkId.POLYGON_MAINNET,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  USDT: {
    type: "address" as const,
    address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    networkId: NetworkId.POLYGON_MAINNET,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  WETH: {
    type: "address" as const,
    address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    networkId: NetworkId.POLYGON_MAINNET,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
  } satisfies Token & { symbol: string; name: string; decimals: number },
};

// Arbitrum One Tokens
export const ARBITRUM_ONE = {
  ETH: {
    type: "native" as const,
    networkId: NetworkId.ARBITRUM_ONE,
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  USDC: {
    type: "address" as const,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    networkId: NetworkId.ARBITRUM_ONE,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  USDT: {
    type: "address" as const,
    address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    networkId: NetworkId.ARBITRUM_ONE,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  WETH: {
    type: "address" as const,
    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    networkId: NetworkId.ARBITRUM_ONE,
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
  } satisfies Token & { symbol: string; name: string; decimals: number },
};


// Solana Mainnet Tokens
export const SOLANA_MAINNET = {
  SOL: {
    type: "native" as const,
    networkId: NetworkId.SOLANA_MAINNET,
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  USDC: {
    type: "address" as const,
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    networkId: NetworkId.SOLANA_MAINNET,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  USDT: {
    type: "address" as const,
    address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    networkId: NetworkId.SOLANA_MAINNET,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
  } satisfies Token & { symbol: string; name: string; decimals: number },

  WSOL: {
    type: "address" as const,
    address: "So11111111111111111111111111111111111111112",
    networkId: NetworkId.SOLANA_MAINNET,
    symbol: "WSOL",
    name: "Wrapped SOL",
    decimals: 9,
  } satisfies Token & { symbol: string; name: string; decimals: number },
};


/**
 * All supported tokens organized by network
 */
export const TOKENS = {
  ETHEREUM_MAINNET,
  BASE_MAINNET,
  POLYGON_MAINNET,
  ARBITRUM_ONE,
  SOLANA_MAINNET,
};
