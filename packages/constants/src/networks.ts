import { NetworkId } from "./network-ids";

export interface NetworkConfig {
  name: string;
  chain: string;
  network: string;
  chainId?: string; // Internal ChainID for swapper API
  slip44?: string; // SLIP-44 coin type
  explorer?: {
    name: string;
    transactionUrl: string; // Template with {hash} placeholder
    addressUrl: string; // Template with {address} placeholder
  };
}

export const NETWORK_CONFIGS: Record<NetworkId, NetworkConfig> = {
  // Solana Networks
  [NetworkId.SOLANA_MAINNET]: {
    name: "Solana Mainnet",
    chain: "solana",
    network: "mainnet",
    chainId: "solana:101",
    slip44: "501",
    explorer: {
      name: "Solscan",
      transactionUrl: "https://solscan.io/tx/{hash}",
      addressUrl: "https://solscan.io/account/{address}",
    },
  },
  [NetworkId.SOLANA_DEVNET]: {
    name: "Solana Devnet",
    chain: "solana",
    network: "devnet",
    chainId: "solana:103",
    slip44: "501",
    explorer: {
      name: "Solscan",
      transactionUrl: "https://solscan.io/tx/{hash}?cluster=devnet",
      addressUrl: "https://solscan.io/account/{address}?cluster=devnet",
    },
  },
  [NetworkId.SOLANA_TESTNET]: {
    name: "Solana Testnet",
    chain: "solana",
    network: "testnet",
    chainId: "solana:102",
    slip44: "501",
    explorer: {
      name: "Solscan",
      transactionUrl: "https://solscan.io/tx/{hash}?cluster=testnet",
      addressUrl: "https://solscan.io/account/{address}?cluster=testnet",
    },
  },

  // Ethereum Networks
  [NetworkId.ETHEREUM_MAINNET]: {
    name: "Ethereum Mainnet",
    chain: "ethereum",
    network: "mainnet",
    chainId: "eip155:1",
    slip44: "60",
    explorer: {
      name: "Etherscan",
      transactionUrl: "https://etherscan.io/tx/{hash}",
      addressUrl: "https://etherscan.io/address/{address}",
    },
  },
  [NetworkId.ETHEREUM_GOERLI]: {
    name: "Ethereum Goerli",
    chain: "ethereum",
    network: "goerli",
    chainId: "eip155:11155111", // Maps to Sepolia for swapper
    slip44: "60",
    explorer: {
      name: "Etherscan",
      transactionUrl: "https://goerli.etherscan.io/tx/{hash}",
      addressUrl: "https://goerli.etherscan.io/address/{address}",
    },
  },
  [NetworkId.ETHEREUM_SEPOLIA]: {
    name: "Ethereum Sepolia",
    chain: "ethereum",
    network: "sepolia",
    chainId: "eip155:11155111",
    slip44: "60",
    explorer: {
      name: "Etherscan",
      transactionUrl: "https://sepolia.etherscan.io/tx/{hash}",
      addressUrl: "https://sepolia.etherscan.io/address/{address}",
    },
  },

  // Polygon Networks
  [NetworkId.POLYGON_MAINNET]: {
    name: "Polygon Mainnet",
    chain: "polygon",
    network: "mainnet",
    chainId: "eip155:137",
    slip44: "137",
    explorer: {
      name: "Polygonscan",
      transactionUrl: "https://polygonscan.com/tx/{hash}",
      addressUrl: "https://polygonscan.com/address/{address}",
    },
  },
  [NetworkId.POLYGON_MUMBAI]: {
    name: "Polygon Mumbai",
    chain: "polygon",
    network: "mumbai",
    chainId: "eip155:80002", // Maps to Amoy for swapper
    slip44: "137",
    explorer: {
      name: "Polygonscan",
      transactionUrl: "https://mumbai.polygonscan.com/tx/{hash}",
      addressUrl: "https://mumbai.polygonscan.com/address/{address}",
    },
  },
  [NetworkId.POLYGON_AMOY]: {
    name: "Polygon Amoy",
    chain: "polygon",
    network: "amoy",
    chainId: "eip155:80002",
    slip44: "137",
    explorer: {
      name: "Polygonscan",
      transactionUrl: "https://amoy.polygonscan.com/tx/{hash}",
      addressUrl: "https://amoy.polygonscan.com/address/{address}",
    },
  },

  // Base Networks
  [NetworkId.BASE_MAINNET]: {
    name: "Base Mainnet",
    chain: "base",
    network: "mainnet",
    chainId: "eip155:8453",
    slip44: "8453",
    explorer: {
      name: "Basescan",
      transactionUrl: "https://basescan.org/tx/{hash}",
      addressUrl: "https://basescan.org/address/{address}",
    },
  },
  [NetworkId.BASE_GOERLI]: {
    name: "Base Goerli",
    chain: "base",
    network: "goerli",
    chainId: "eip155:84532", // Maps to Sepolia for swapper
    slip44: "8453",
    explorer: {
      name: "Basescan",
      transactionUrl: "https://goerli.basescan.org/tx/{hash}",
      addressUrl: "https://goerli.basescan.org/address/{address}",
    },
  },
  [NetworkId.BASE_SEPOLIA]: {
    name: "Base Sepolia",
    chain: "base",
    network: "sepolia",
    chainId: "eip155:84532",
    slip44: "8453",
    explorer: {
      name: "Basescan",
      transactionUrl: "https://sepolia.basescan.org/tx/{hash}",
      addressUrl: "https://sepolia.basescan.org/address/{address}",
    },
  },

  // Arbitrum Networks
  [NetworkId.ARBITRUM_ONE]: {
    name: "Arbitrum One",
    chain: "arbitrum",
    network: "mainnet",
    chainId: "eip155:42161",
    slip44: "42161",
    explorer: {
      name: "Arbiscan",
      transactionUrl: "https://arbiscan.io/tx/{hash}",
      addressUrl: "https://arbiscan.io/address/{address}",
    },
  },
  [NetworkId.ARBITRUM_GOERLI]: {
    name: "Arbitrum Goerli",
    chain: "arbitrum",
    network: "goerli",
    chainId: "eip155:421614", // Maps to Sepolia for swapper
    slip44: "42161",
    explorer: {
      name: "Arbiscan",
      transactionUrl: "https://goerli.arbiscan.io/tx/{hash}",
      addressUrl: "https://goerli.arbiscan.io/address/{address}",
    },
  },
  [NetworkId.ARBITRUM_SEPOLIA]: {
    name: "Arbitrum Sepolia",
    chain: "arbitrum",
    network: "sepolia",
    chainId: "eip155:421614",
    slip44: "42161",
    explorer: {
      name: "Arbiscan",
      transactionUrl: "https://sepolia.arbiscan.io/tx/{hash}",
      addressUrl: "https://sepolia.arbiscan.io/address/{address}",
    },
  },

  // Optimism Networks
  [NetworkId.OPTIMISM_MAINNET]: {
    name: "Optimism Mainnet",
    chain: "optimism",
    network: "mainnet",
    chainId: "eip155:10",
    slip44: "60", // Uses Ethereum SLIP-44
    explorer: {
      name: "Optimistic Etherscan",
      transactionUrl: "https://optimistic.etherscan.io/tx/{hash}",
      addressUrl: "https://optimistic.etherscan.io/address/{address}",
    },
  },
  [NetworkId.OPTIMISM_GOERLI]: {
    name: "Optimism Goerli",
    chain: "optimism",
    network: "goerli",
    chainId: "eip155:420",
    slip44: "60", // Uses Ethereum SLIP-44
    explorer: {
      name: "Optimistic Etherscan",
      transactionUrl: "https://goerli-optimism.etherscan.io/tx/{hash}",
      addressUrl: "https://goerli-optimism.etherscan.io/address/{address}",
    },
  },

  // Bitcoin Networks (for future support)
  [NetworkId.BITCOIN_MAINNET]: {
    name: "Bitcoin Mainnet",
    chain: "bitcoin",
    network: "mainnet",
    chainId: "bip122:000000000019d6689c085ae165831e93",
    slip44: "0",
    explorer: {
      name: "Blockstream",
      transactionUrl: "https://blockstream.info/tx/{hash}",
      addressUrl: "https://blockstream.info/address/{address}",
    },
  },
  [NetworkId.BITCOIN_TESTNET]: {
    name: "Bitcoin Testnet",
    chain: "bitcoin",
    network: "testnet",
    chainId: "bip122:000000000933ea01ad0ee984209779ba",
    slip44: "0",
    explorer: {
      name: "Blockstream",
      transactionUrl: "https://blockstream.info/testnet/tx/{hash}",
      addressUrl: "https://blockstream.info/testnet/address/{address}",
    },
  },

  // Sui Networks (for future support)
  [NetworkId.SUI_MAINNET]: {
    name: "Sui Mainnet",
    chain: "sui",
    network: "mainnet",
    chainId: "sui:mainnet",
    slip44: "784",
    explorer: {
      name: "Sui Explorer",
      transactionUrl: "https://explorer.sui.io/txblock/{hash}?network=mainnet",
      addressUrl: "https://explorer.sui.io/address/{address}?network=mainnet",
    },
  },
  [NetworkId.SUI_TESTNET]: {
    name: "Sui Testnet",
    chain: "sui",
    network: "testnet",
    chainId: "sui:testnet",
    slip44: "784",
    explorer: {
      name: "Sui Explorer",
      transactionUrl: "https://explorer.sui.io/txblock/{hash}?network=testnet",
      addressUrl: "https://explorer.sui.io/address/{address}?network=testnet",
    },
  },
  [NetworkId.SUI_DEVNET]: {
    name: "Sui Devnet",
    chain: "sui",
    network: "devnet",
    chainId: "sui:devnet",
    slip44: "784",
    explorer: {
      name: "Sui Explorer",
      transactionUrl: "https://explorer.sui.io/txblock/{hash}?network=devnet",
      addressUrl: "https://explorer.sui.io/address/{address}?network=devnet",
    },
  },
};

export function getNetworkConfig(networkId: NetworkId): NetworkConfig | undefined {
  return NETWORK_CONFIGS[networkId];
}

export function getExplorerUrl(
  networkId: NetworkId,
  type: "transaction" | "address",
  value: string,
): string | undefined {
  const config = getNetworkConfig(networkId);
  if (!config?.explorer) return undefined;

  const template = type === "transaction" ? config.explorer.transactionUrl : config.explorer.addressUrl;
  const placeholder = type === "transaction" ? "{hash}" : "{address}";

  return template.replace(placeholder, value);
}

export function getSupportedNetworks(): NetworkId[] {
  return Object.keys(NETWORK_CONFIGS) as NetworkId[];
}

export function getNetworksByChain(chain: string): NetworkId[] {
  return Object.entries(NETWORK_CONFIGS)
    .filter(([_, config]) => config.chain === chain)
    .map(([networkId]) => networkId as NetworkId);
}

// ===== SWAPPER-SPECIFIC CONSTANTS =====

/**
 * Swapper swap types based on chain namespace
 */
export enum SwapType {
  Solana = "solana",
  EVM = "eip155", 
  XChain = "xchain",
  Sui = "sui",
}

/**
 * Fee types for swapper operations
 */
export enum FeeType {
  NETWORK = "NETWORK",
  PROTOCOL = "PROTOCOL", 
  PHANTOM = "PHANTOM",
  OTHER = "OTHER",
}

/**
 * Get internal ChainID for swapper API from NetworkId
 */
export function getChainIdForSwapper(networkId: NetworkId): string | undefined {
  return NETWORK_CONFIGS[networkId]?.chainId;
}

/**
 * Get SLIP-44 coin type from NetworkId
 */
export function getSlip44ForNetwork(networkId: NetworkId): string | undefined {
  return NETWORK_CONFIGS[networkId]?.slip44;
}

/**
 * Maps NetworkId to ChainID format for backward compatibility with swapper-sdk
 * @deprecated Use getChainIdForSwapper() instead
 */
export function getNetworkToChainMapping(): Record<NetworkId, string> {
  const mapping: Record<string, string> = {};
  Object.entries(NETWORK_CONFIGS).forEach(([networkId, config]) => {
    if (config.chainId) {
      mapping[networkId] = config.chainId;
    }
  });
  return mapping as Record<NetworkId, string>;
}

/**
 * Get SLIP-44 mapping by chainId for backward compatibility with swapper-sdk
 * @deprecated Use getSlip44ForNetwork() instead  
 */
export function getNativeTokenSlip44ByChain(): Record<string, string> {
  const mapping: Record<string, string> = {};
  Object.values(NETWORK_CONFIGS).forEach(config => {
    if (config.chainId && config.slip44) {
      mapping[config.chainId] = config.slip44;
    }
  });
  return mapping;
}

/**
 * Fallback SLIP-44 values by namespace (for backward compatibility)
 * @deprecated Use getSlip44ForNetwork() instead
 */
export const NATIVE_TOKEN_SLIP44_FALLBACK: Record<string, string> = {
  solana: "501",
  eip155: "60", // Ethereum default
  sui: "784", 
  bip122: "0", // Bitcoin
};
