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

  // Other EVM chains
  BscMainnet = "eip155:56",
  OptimismMainnet = "eip155:10",
  AvalancheMainnet = "eip155:43114",

  // Sui
  SuiMainnet = "sui:mainnet",
  SuiTestnet = "sui:testnet",
  SuiDevnet = "sui:devnet",

  // Bitcoin
  BitcoinMainnet = "bip122:000000000019d6689c085ae165831e93",
  BitcoinTestnet = "bip122:000000000933ea01ad0ee984209779ba",
}

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