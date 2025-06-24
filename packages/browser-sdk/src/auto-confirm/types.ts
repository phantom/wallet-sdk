export type NetworkID = 
  // BTC
  | "bip122:000000000019d6689c085ae165831e93"
  | "bip122:000000000933ea01ad0ee984209779ba"
  // SOLANA  
  | "solana:101" 
  | "solana:102" 
  | "solana:103" 
  | "solana:localnet"
  // EVM
  | "eip155:1" 
  | "eip155:11155111" 
  | "eip155:137" 
  | "eip155:80002"
  | "eip155:8453" 
  | "eip155:84532" 
  | "eip155:143" 
  | "eip155:10143" 
  | "eip155:41454" 
  | "eip155:42161" 
  | "eip155:421614"
  // HYPERCORE
  | "hypercore:mainnet" 
  | "hypercore:testnet"
  // SUI
  | "sui:mainnet" 
  | "sui:testnet";

export interface AutoConfirmEnableParams {
  chains?: NetworkID[];
}

export interface AutoConfirmResult {
  enabled: boolean;
  chains: NetworkID[];
}

export interface AutoConfirmSupportedChainsResult {
  chains: NetworkID[];
}

export interface PhantomProvider {
  request(args: { method: string; params?: any }): Promise<any>;
}