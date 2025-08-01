import type { RPCConfig } from "./types";

// Safe environment variable access for isomorphic support
const getEnvVar = (name: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  return undefined;
};

// Default RPC endpoints - can be overridden via environment variables or config
const DEFAULT_RPC_CONFIG: RPCConfig = {
  solana: {
    mainnet: getEnvVar('SOLANA_MAINNET_RPC') || "https://api.mainnet-beta.solana.com",
    devnet: getEnvVar('SOLANA_DEVNET_RPC') || "https://api.devnet.solana.com",
    testnet: getEnvVar('SOLANA_TESTNET_RPC') || "https://api.testnet.solana.com",
  },
  ethereum: {
    mainnet: getEnvVar('ETHEREUM_MAINNET_RPC') || "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
    sepolia: getEnvVar('ETHEREUM_SEPOLIA_RPC') || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    goerli: getEnvVar('ETHEREUM_GOERLI_RPC') || "https://goerli.infura.io/v3/YOUR_INFURA_KEY",
  },
  polygon: {
    mainnet: getEnvVar('POLYGON_MAINNET_RPC') || "https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY",
    mumbai: getEnvVar('POLYGON_MUMBAI_RPC') || "https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY",
  },
  arbitrum: {
    mainnet: getEnvVar('ARBITRUM_MAINNET_RPC') || "https://arbitrum-mainnet.infura.io/v3/YOUR_INFURA_KEY",
    sepolia: getEnvVar('ARBITRUM_SEPOLIA_RPC') || "https://arbitrum-sepolia.infura.io/v3/YOUR_INFURA_KEY",
  },
  optimism: {
    mainnet: getEnvVar('OPTIMISM_MAINNET_RPC') || "https://optimism-mainnet.infura.io/v3/YOUR_INFURA_KEY",
    sepolia: getEnvVar('OPTIMISM_SEPOLIA_RPC') || "https://optimism-sepolia.infura.io/v3/YOUR_INFURA_KEY",
  },
  base: {
    mainnet: getEnvVar('BASE_MAINNET_RPC') || "https://mainnet.base.org",
    sepolia: getEnvVar('BASE_SEPOLIA_RPC') || "https://sepolia.base.org",
  },
  bsc: {
    mainnet: getEnvVar('BSC_MAINNET_RPC') || "https://bsc-dataseed.binance.org",
    testnet: getEnvVar('BSC_TESTNET_RPC') || "https://data-seed-prebsc-1-s1.binance.org:8545",
  },
  avalanche: {
    mainnet: getEnvVar('AVALANCHE_MAINNET_RPC') || "https://api.avax.network/ext/bc/C/rpc",
    fuji: getEnvVar('AVALANCHE_FUJI_RPC') || "https://api.avax-test.network/ext/bc/C/rpc",
  },
  bitcoin: {
    mainnet: getEnvVar('BITCOIN_MAINNET_RPC') || "https://blockstream.info/api",
    testnet: getEnvVar('BITCOIN_TESTNET_RPC') || "https://blockstream.info/testnet/api",
  },
  sui: {
    mainnet: getEnvVar('SUI_MAINNET_RPC') || "https://fullnode.mainnet.sui.io:443",
    testnet: getEnvVar('SUI_TESTNET_RPC') || "https://fullnode.testnet.sui.io:443",
    devnet: getEnvVar('SUI_DEVNET_RPC') || "https://fullnode.devnet.sui.io:443",
  },
};

let currentConfig: RPCConfig = { ...DEFAULT_RPC_CONFIG };

export function getRPCConfig(): RPCConfig {
  return currentConfig;
}

export function setRPCConfig(config: Partial<RPCConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
    // Deep merge for nested objects
    solana: { ...currentConfig.solana, ...config.solana },
    ethereum: { ...currentConfig.ethereum, ...config.ethereum },
    polygon: { ...currentConfig.polygon, ...config.polygon },
    arbitrum: { ...currentConfig.arbitrum, ...config.arbitrum },
    optimism: { ...currentConfig.optimism, ...config.optimism },
    base: { ...currentConfig.base, ...config.base },
    bsc: { ...currentConfig.bsc, ...config.bsc },
    avalanche: { ...currentConfig.avalanche, ...config.avalanche },
    bitcoin: { ...currentConfig.bitcoin, ...config.bitcoin },
    sui: { ...currentConfig.sui, ...config.sui },
  };
}

export function getRPCUrl(networkId: string): string {
  const config = getRPCConfig();
  const [chain, network] = networkId.toLowerCase().split(':');
  
  switch (chain) {
    case 'solana':
      return config.solana?.[network as keyof typeof config.solana] || config.solana?.mainnet || DEFAULT_RPC_CONFIG.solana!.mainnet!;
    
    case 'ethereum':
    case 'eip155':
      const ethNetwork = network === '1' ? 'mainnet' : network === '11155111' ? 'sepolia' : network === '5' ? 'goerli' : 'mainnet';
      return config.ethereum?.[ethNetwork as keyof typeof config.ethereum] || config.ethereum?.mainnet || DEFAULT_RPC_CONFIG.ethereum!.mainnet!;
    
    case 'polygon':
      const polygonNetwork = network === '137' ? 'mainnet' : network === '80001' ? 'mumbai' : 'mainnet';
      return config.polygon?.[polygonNetwork as keyof typeof config.polygon] || config.polygon?.mainnet || DEFAULT_RPC_CONFIG.polygon!.mainnet!;
    
    case 'arbitrum':
      const arbitrumNetwork = network === '42161' ? 'mainnet' : network === '421614' ? 'sepolia' : 'mainnet';
      return config.arbitrum?.[arbitrumNetwork as keyof typeof config.arbitrum] || config.arbitrum?.mainnet || DEFAULT_RPC_CONFIG.arbitrum!.mainnet!;
    
    case 'optimism':
      const optimismNetwork = network === '10' ? 'mainnet' : network === '11155420' ? 'sepolia' : 'mainnet';
      return config.optimism?.[optimismNetwork as keyof typeof config.optimism] || config.optimism?.mainnet || DEFAULT_RPC_CONFIG.optimism!.mainnet!;
    
    case 'base':
      const baseNetwork = network === '8453' ? 'mainnet' : network === '84532' ? 'sepolia' : 'mainnet';
      return config.base?.[baseNetwork as keyof typeof config.base] || config.base?.mainnet || DEFAULT_RPC_CONFIG.base!.mainnet!;
    
    case 'bsc':
      const bscNetwork = network === '56' ? 'mainnet' : network === '97' ? 'testnet' : 'mainnet';
      return config.bsc?.[bscNetwork as keyof typeof config.bsc] || config.bsc?.mainnet || DEFAULT_RPC_CONFIG.bsc!.mainnet!;
    
    case 'avalanche':
      const avalancheNetwork = network === '43114' ? 'mainnet' : network === '43113' ? 'fuji' : 'mainnet';
      return config.avalanche?.[avalancheNetwork as keyof typeof config.avalanche] || config.avalanche?.mainnet || DEFAULT_RPC_CONFIG.avalanche!.mainnet!;
    
    case 'bitcoin':
      return config.bitcoin?.[network as keyof typeof config.bitcoin] || config.bitcoin?.mainnet || DEFAULT_RPC_CONFIG.bitcoin!.mainnet!;
    
    case 'sui':
      return config.sui?.[network as keyof typeof config.sui] || config.sui?.mainnet || DEFAULT_RPC_CONFIG.sui!.mainnet!;
    
    default:
      throw new Error(`Unsupported network: ${networkId}`);
  }
}