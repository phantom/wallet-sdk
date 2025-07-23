// Import SubmissionConfig interface
interface SubmissionConfig {
  chain: string; // e.g., 'solana', 'ethereum', 'polygon'
  network: string; // e.g., 'mainnet', 'devnet', 'sepolia'
}

/**
 * User-friendly enum for CAIP-2 network identifiers
 * Use these constants instead of hardcoding network IDs
 */
export enum NetworkId {
  // Solana Networks
  SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  SOLANA_DEVNET = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  SOLANA_TESTNET = 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
  
  // Ethereum Networks
  ETHEREUM_MAINNET = 'eip155:1',
  ETHEREUM_GOERLI = 'eip155:5',
  ETHEREUM_SEPOLIA = 'eip155:11155111',
  
  // Polygon Networks
  POLYGON_MAINNET = 'eip155:137',
  POLYGON_MUMBAI = 'eip155:80001',
  
  // Optimism Networks
  OPTIMISM_MAINNET = 'eip155:10',
  OPTIMISM_GOERLI = 'eip155:420',
  
  // Arbitrum Networks
  ARBITRUM_ONE = 'eip155:42161',
  ARBITRUM_GOERLI = 'eip155:421613',
  
  // Base Networks
  BASE_MAINNET = 'eip155:8453',
  BASE_GOERLI = 'eip155:84531',
  BASE_SEPOLIA = 'eip155:84532',
  
  // Bitcoin Networks (for future support)
  BITCOIN_MAINNET = 'bip122:000000000019d6689c085ae165831e93',
  BITCOIN_TESTNET = 'bip122:000000000933ea01ad0ee984209779ba',
  
  // Sui Networks (for future support)
  SUI_MAINNET = 'sui:35834a8a',
  SUI_TESTNET = 'sui:4c78adac',
}



/**
 * CAIP-2 Network ID to SubmissionConfig mapping
 * Format: namespace:reference
 * 
 * Common CAIP-2 network IDs:
 * - Solana: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp (mainnet)
 * - Ethereum: eip155:1 (mainnet)
 * - Polygon: eip155:137 (mainnet)
 * - etc.
 */

interface NetworkMapping {
  chain: string;
  network: string;
  description?: string;
}

const CAIP2_NETWORK_MAPPINGS: Record<string, NetworkMapping> = {
  // Solana networks
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
    chain: 'solana',
    network: 'mainnet',
    description: 'Solana Mainnet-Beta'
  },
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': {
    chain: 'solana',
    network: 'devnet',
    description: 'Solana Devnet'
  },
  'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z': {
    chain: 'solana',
    network: 'testnet',
    description: 'Solana Testnet'
  },
  
  // Ethereum/EVM networks
  'eip155:1': {
    chain: 'ethereum',
    network: 'mainnet',
    description: 'Ethereum Mainnet'
  },
  'eip155:5': {
    chain: 'ethereum',
    network: 'goerli',
    description: 'Goerli Testnet'
  },
  'eip155:11155111': {
    chain: 'ethereum',
    network: 'sepolia',
    description: 'Sepolia Testnet'
  },
  'eip155:137': {
    chain: 'polygon',
    network: 'mainnet',
    description: 'Polygon Mainnet'
  },
  'eip155:80001': {
    chain: 'polygon',
    network: 'mumbai',
    description: 'Polygon Mumbai Testnet'
  },
  'eip155:10': {
    chain: 'optimism',
    network: 'mainnet',
    description: 'Optimism Mainnet'
  },
  'eip155:420': {
    chain: 'optimism',
    network: 'goerli',
    description: 'Optimism Goerli Testnet'
  },
  'eip155:42161': {
    chain: 'arbitrum',
    network: 'mainnet',
    description: 'Arbitrum One'
  },
  'eip155:421613': {
    chain: 'arbitrum',
    network: 'goerli',
    description: 'Arbitrum Goerli'
  },
  'eip155:8453': {
    chain: 'base',
    network: 'mainnet',
    description: 'Base Mainnet'
  },
  'eip155:84531': {
    chain: 'base',
    network: 'goerli',
    description: 'Base Goerli Testnet'
  },
  'eip155:84532': {
    chain: 'base',
    network: 'sepolia',
    description: 'Base Sepolia Testnet'
  },
  
  // Bitcoin networks (for future support)
  'bip122:000000000019d6689c085ae165831e93': {
    chain: 'bitcoin',
    network: 'mainnet',
    description: 'Bitcoin Mainnet'
  },
  'bip122:000000000933ea01ad0ee984209779ba': {
    chain: 'bitcoin',
    network: 'testnet',
    description: 'Bitcoin Testnet'
  },
  
  // Sui networks (for future support)
  'sui:35834a8a': {
    chain: 'sui',
    network: 'mainnet',
    description: 'Sui Mainnet'
  },
  'sui:4c78adac': {
    chain: 'sui',
    network: 'testnet',
    description: 'Sui Testnet'
  },
};

/**
 * Derive SubmissionConfig from a CAIP-2 network ID
 * @param networkId - CAIP-2 compliant network ID (e.g., 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')
 * @returns SubmissionConfig if network supports transaction submission, undefined otherwise
 */
export function deriveSubmissionConfig(networkId: string): SubmissionConfig | undefined {
  const mapping = CAIP2_NETWORK_MAPPINGS[networkId];
  
  if (!mapping) {
    // Network not found in mappings - cannot derive submission config
    return undefined;
  }
  
  return {
    chain: mapping.chain,
    network: mapping.network
  };
}

/**
 * Check if a network ID supports transaction submission
 * @param networkId - CAIP-2 compliant network ID
 * @returns true if the network supports transaction submission
 */
export function supportsTransactionSubmission(networkId: string): boolean {
  return networkId in CAIP2_NETWORK_MAPPINGS;
}

/**
 * Get network description for a CAIP-2 network ID
 * @param networkId - CAIP-2 compliant network ID
 * @returns Network description or undefined if not found
 */
export function getNetworkDescription(networkId: string): string | undefined {
  return CAIP2_NETWORK_MAPPINGS[networkId]?.description;
}

/**
 * List all supported CAIP-2 network IDs
 * @returns Array of supported network IDs
 */
export function getSupportedNetworkIds(): string[] {
  return Object.keys(CAIP2_NETWORK_MAPPINGS);
}

/**
 * Get all networks for a specific chain
 * @param chain - Chain name (e.g., 'solana', 'ethereum')
 * @returns Array of network IDs for the specified chain
 */
export function getNetworkIdsByChain(chain: string): string[] {
  return Object.entries(CAIP2_NETWORK_MAPPINGS)
    .filter(([_, mapping]) => mapping.chain.toLowerCase() === chain.toLowerCase())
    .map(([networkId]) => networkId);
}