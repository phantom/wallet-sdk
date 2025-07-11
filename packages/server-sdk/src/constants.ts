import {
  Configuration,
  KMSRPCApi,
  CreateWalletMethodEnum,
  SignTransactionMethodEnum,
  SignRawPayloadMethodEnum,
  Algorithm,
  Curve,
  PublicKeyFormat,
} from '@phantom/openapi-wallet-service';

/**
 * Default derivation paths for different blockchain networks
 */
export enum DerivationPath {
  // Solana - BIP44 standard for Solana (coin type 501)
  Solana = "m/44'/501'/0'/0'",
  
  // Ethereum - BIP44 standard for Ethereum and all EVM-compatible chains (coin type 60)
  Ethereum = "m/44'/60'/0'/0/0",
  
  // Bitcoin - BIP44 standard for Bitcoin (coin type 0)
  Bitcoin = "m/44'/0'/0'/0/0",
  
  // Sui - BIP44 standard for Sui (coin type 784)
  Sui = "m/44'/784'/0'/0'/0'",
}

/**
 * Helper function to get derivation path based on network ID
 */
export function getDerivationPathForNetwork(networkId: string): string {
  // Extract the chain name from network ID format (e.g., "solana:101" -> "solana")
  const network = networkId.split(':')[0].toLowerCase();
  
  switch (network) {
    case 'solana':
      return DerivationPath.Solana;
    case 'sui':
      return DerivationPath.Sui;
    case 'bitcoin':
    case 'btc':
      return DerivationPath.Bitcoin;
    case 'eip155': // EVM chains use eip155 prefix
    case 'ethereum':
    case 'eth':
    default:
      // Default to Ethereum path for all EVM-compatible chains
      return DerivationPath.Ethereum;
  }
}

/**
 * Network configuration with algorithm and curve information
 */
export interface NetworkConfig {
  derivationPath: string;
  curve: 'Ed25519' | 'Secp256k1';
  algorithm: 'Ed25519' | 'Secp256k1' | 'Secp256k1Keccak256';
  addressFormat: 'Solana' | 'Ethereum';
}

/**
 * Get complete network configuration
 */
export function getNetworkConfig(networkId: string): NetworkConfig {
  const network = networkId.split(':')[0].toLowerCase();
  
  switch (network) {
    case 'solana':
      return {
        derivationPath: DerivationPath.Solana,
        curve: Curve.ed25519,
        algorithm: Algorithm.ed25519,
        addressFormat: PublicKeyFormat.solana
      };
    case 'sui':
      return {
        derivationPath: DerivationPath.Sui,
        curve: Curve.ed25519,
        algorithm: Algorithm.ed25519,
        addressFormat: PublicKeyFormat.sui, // Sui uses similar address format to Solana
      };
    case 'bitcoin':
    case 'btc':
      return {
        derivationPath: DerivationPath.Bitcoin,
        curve: 'Secp256k1',
        algorithm: 'Secp256k1',
        addressFormat: 'Ethereum' // Using Ethereum format as placeholder
      };
    default:
      // All EVM-compatible chains (Ethereum, Polygon, BSC, Arbitrum, etc.)
      return {
        derivationPath: DerivationPath.Ethereum,
        curve: 'Secp256k1',
        algorithm: 'Secp256k1',
        addressFormat: 'Ethereum'
      };
  }
}