import { NetworkId } from "./network-ids";

export interface NetworkConfig {
  name: string;
  chain: string;
  network: string;
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
    explorer: {
      name: "Polygonscan",
      transactionUrl: "https://mumbai.polygonscan.com/tx/{hash}",
      addressUrl: "https://mumbai.polygonscan.com/address/{address}",
    },
  },

  // Base Networks
  [NetworkId.BASE_MAINNET]: {
    name: "Base Mainnet",
    chain: "base",
    network: "mainnet",
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
    explorer: {
      name: "Arbiscan",
      transactionUrl: "https://goerli.arbiscan.io/tx/{hash}",
      addressUrl: "https://goerli.arbiscan.io/address/{address}",
    },
  },

  // Optimism Networks
  [NetworkId.OPTIMISM_MAINNET]: {
    name: "Optimism Mainnet",
    chain: "optimism",
    network: "mainnet",
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
    explorer: {
      name: "Sui Explorer",
      transactionUrl: "https://explorer.sui.io/txblock/{hash}?network=testnet",
      addressUrl: "https://explorer.sui.io/address/{address}?network=testnet",
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
