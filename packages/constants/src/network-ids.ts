/**
 * User-friendly enum for CAIP-2 network identifiers
 * Use these constants instead of hardcoding network IDs
 */
export enum NetworkId {
  // Solana Networks
  SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  SOLANA_DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  SOLANA_TESTNET = "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z",

  // Ethereum Networks
  ETHEREUM_MAINNET = "eip155:1",
  ETHEREUM_GOERLI = "eip155:5",
  ETHEREUM_SEPOLIA = "eip155:11155111",

  // Polygon Networks
  POLYGON_MAINNET = "eip155:137",
  POLYGON_MUMBAI = "eip155:80001",

  // Optimism Networks
  OPTIMISM_MAINNET = "eip155:10",
  OPTIMISM_GOERLI = "eip155:420",

  // Arbitrum Networks
  ARBITRUM_ONE = "eip155:42161",
  ARBITRUM_GOERLI = "eip155:421613",

  // Base Networks
  BASE_MAINNET = "eip155:8453",
  BASE_GOERLI = "eip155:84531",
  BASE_SEPOLIA = "eip155:84532",

  // Bitcoin Networks (for future support)
  BITCOIN_MAINNET = "bip122:000000000019d6689c085ae165831e93",
  BITCOIN_TESTNET = "bip122:000000000933ea01ad0ee984209779ba",

  // Sui Networks (for future support)
  SUI_MAINNET = "sui:35834a8a",
  SUI_TESTNET = "sui:4c78adac",
}