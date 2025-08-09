/**
 * User-friendly enum for network identifiers
 * Copied from @phantom/client for consistency
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
  POLYGON_AMOY = "eip155:80002",

  // Arbitrum Networks
  ARBITRUM_ONE = "eip155:42161",
  ARBITRUM_GOERLI = "eip155:421613",
  ARBITRUM_SEPOLIA = "eip155:421614",

  // Base Networks
  BASE_MAINNET = "eip155:8453",
  BASE_GOERLI = "eip155:84531",
  BASE_SEPOLIA = "eip155:84532",

  // Bitcoin Networks
  BITCOIN_MAINNET = "bip122:000000000019d6689c085ae165831e93",
  BITCOIN_TESTNET = "bip122:000000000933ea01ad0ee984209779ba",

  // Sui Networks
  SUI_MAINNET = "sui:35834a8a",
  SUI_TESTNET = "sui:4c78adac",
  SUI_DEVNET = "sui:devnet",
}

/**
 * Internal ChainID enum used by the Swapper API
 * This is not exposed to SDK users
 */
export enum ChainID {
  // Solana
  SolanaMainnet = "solana:101",
  SolanaTestnet = "solana:102",
  SolanaDevnet = "solana:103",

  // Ethereum
  EthereumMainnet = "eip155:1",
  EthereumSepolia = "eip155:11155111",

  // Polygon
  PolygonMainnet = "eip155:137",
  PolygonAmoy = "eip155:80002",

  // Base
  BaseMainnet = "eip155:8453",
  BaseSepolia = "eip155:84532",

  // Arbitrum
  ArbitrumMainnet = "eip155:42161",
  ArbitrumSepolia = "eip155:421614",

  // Sui
  SuiMainnet = "sui:mainnet",
  SuiTestnet = "sui:testnet",
  SuiDevnet = "sui:devnet",

  // Bitcoin
  BitcoinMainnet = "bip122:000000000019d6689c085ae165831e93",
  BitcoinTestnet = "bip122:000000000933ea01ad0ee984209779ba",
}

/**
 * Maps NetworkId to internal ChainID format
 */
export const NETWORK_TO_CHAIN_MAP: Record<NetworkId, ChainID> = {
  // Solana
  [NetworkId.SOLANA_MAINNET]: ChainID.SolanaMainnet,
  [NetworkId.SOLANA_TESTNET]: ChainID.SolanaTestnet,
  [NetworkId.SOLANA_DEVNET]: ChainID.SolanaDevnet,

  // Ethereum
  [NetworkId.ETHEREUM_MAINNET]: ChainID.EthereumMainnet,
  [NetworkId.ETHEREUM_SEPOLIA]: ChainID.EthereumSepolia,
  [NetworkId.ETHEREUM_GOERLI]: ChainID.EthereumSepolia, // Map Goerli to Sepolia

  // Polygon
  [NetworkId.POLYGON_MAINNET]: ChainID.PolygonMainnet,
  [NetworkId.POLYGON_AMOY]: ChainID.PolygonAmoy,
  [NetworkId.POLYGON_MUMBAI]: ChainID.PolygonAmoy, // Map Mumbai to Amoy

  // Base
  [NetworkId.BASE_MAINNET]: ChainID.BaseMainnet,
  [NetworkId.BASE_SEPOLIA]: ChainID.BaseSepolia,
  [NetworkId.BASE_GOERLI]: ChainID.BaseSepolia, // Map Goerli to Sepolia

  // Arbitrum
  [NetworkId.ARBITRUM_ONE]: ChainID.ArbitrumMainnet,
  [NetworkId.ARBITRUM_SEPOLIA]: ChainID.ArbitrumSepolia,
  [NetworkId.ARBITRUM_GOERLI]: ChainID.ArbitrumSepolia, // Map Goerli to Sepolia

  // Sui
  [NetworkId.SUI_MAINNET]: ChainID.SuiMainnet,
  [NetworkId.SUI_TESTNET]: ChainID.SuiTestnet,
  [NetworkId.SUI_DEVNET]: ChainID.SuiDevnet,

  // Bitcoin
  [NetworkId.BITCOIN_MAINNET]: ChainID.BitcoinMainnet,
  [NetworkId.BITCOIN_TESTNET]: ChainID.BitcoinTestnet,
};

/**
 * Get SLIP-44 coin type for native tokens by chain ID
 * Only includes supported networks from NetworkId enum
 */
export const NATIVE_TOKEN_SLIP44_BY_CHAIN: Record<string, string> = {
  // Solana
  "solana:101": "501",
  "solana:102": "501",
  "solana:103": "501",

  // Ethereum
  "eip155:1": "60",
  "eip155:11155111": "60", // Sepolia

  // Polygon
  "eip155:137": "137",
  "eip155:80002": "137", // Amoy

  // Base - uses its own SLIP-44
  "eip155:8453": "8453",
  "eip155:84532": "8453", // Sepolia

  // Arbitrum  
  "eip155:42161": "42161",
  "eip155:421614": "42161", // Sepolia


  // Sui
  "sui:mainnet": "784",
  "sui:testnet": "784",
  "sui:devnet": "784",

  // Bitcoin
  "bip122:000000000019d6689c085ae165831e93": "0",
  "bip122:000000000933ea01ad0ee984209779ba": "0",
};

/**
 * Fallback SLIP-44 values by namespace (for backward compatibility)
 */
export const NATIVE_TOKEN_SLIP44: Record<string, string> = {
  solana: "501",
  eip155: "60", // Ethereum default
  sui: "784",
  bip122: "0", // Bitcoin
};