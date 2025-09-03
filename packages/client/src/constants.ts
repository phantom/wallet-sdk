import { DerivationInfoCurveEnum, DerivationInfoAddressFormatEnum, Algorithm } from "@phantom/openapi-wallet-service";
import { type NetworkId } from "@phantom/constants";

/**
 * Default derivation paths for different blockchain networks with interpolated account index
 */
export const DerivationPath = {
  // Solana - BIP44 standard for Solana (coin type 501)
  Solana: (accountIndex: number = 0) => `m/44'/501'/${accountIndex}'/0'`,

  // Ethereum - BIP44 standard for Ethereum and all EVM-compatible chains (coin type 60)
  Ethereum: (accountIndex: number = 0) => `m/44'/60'/0'/0/${accountIndex}`,

  // Bitcoin - BIP84 standard for Bitcoin (coin type 0)
  Bitcoin: (accountIndex: number = 0) => `m/84'/0'/${accountIndex}'/0`,

  // Sui - BIP44 standard for Sui (coin type 784)
  Sui: (accountIndex: number = 0) => `m/44'/784'/${accountIndex}'/0'/0'`,
} as const;

/**
 * Helper function to get derivation path based on network ID
 */
export function getDerivationPathForNetwork(networkId: string, accountIndex: number = 0): string {
  // Extract the chain name from network ID format (e.g., "solana:mainnet" -> "solana")
  const network = networkId.split(":")[0].toLowerCase();

  switch (network) {
    case "solana":
      return DerivationPath.Solana(accountIndex);
    case "sui":
      return DerivationPath.Sui(accountIndex);
    case "bitcoin":
    case "btc":
      return DerivationPath.Bitcoin(accountIndex);
    case "eip155": // EVM chains use eip155 prefix
    case "ethereum":
    case "eth":
    default:
      // Default to Ethereum path for all EVM-compatible chains
      return DerivationPath.Ethereum(accountIndex);
  }
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  derivationPath: string;
  curve: DerivationInfoCurveEnum;
  algorithm: Algorithm;
  addressFormat: DerivationInfoAddressFormatEnum;
}

/**
 * Get complete network configuration
 */
export function getNetworkConfig(networkId: NetworkId, accountIndex: number = 0): NetworkConfig | null {
  const network = networkId.split(":")[0].toLowerCase();

  switch (network) {
    case "solana":
      return {
        derivationPath: DerivationPath.Solana(accountIndex),
        curve: DerivationInfoCurveEnum.ed25519,
        algorithm: Algorithm.ed25519,
        addressFormat: DerivationInfoAddressFormatEnum.solana,
      };
    case "sui":
      return {
        derivationPath: DerivationPath.Sui(accountIndex),
        curve: DerivationInfoCurveEnum.ed25519,
        algorithm: Algorithm.ed25519,
        addressFormat: DerivationInfoAddressFormatEnum.sui,
      };
    case "bitcoin":
    case "btc":
      return {
        derivationPath: DerivationPath.Bitcoin(accountIndex),
        curve: DerivationInfoCurveEnum.secp256k1,
        algorithm: Algorithm.secp256k1,
        addressFormat: DerivationInfoAddressFormatEnum.bitcoinSegwit, // Bitcoin uses a different format, but for SDK consistency we use Ethereum format
      };
    case "eip155": // EVM chains use eip155 prefix
      // All EVM-compatible chains (Ethereum, Polygon, BSC, Arbitrum, etc.)
      return {
        derivationPath: DerivationPath.Ethereum(accountIndex),
        curve: DerivationInfoCurveEnum.secp256k1,
        algorithm: Algorithm.secp256k1,
        addressFormat: DerivationInfoAddressFormatEnum.ethereum, // EVM chains use Ethereum address format
      };

    default:
      return null;
  }
}

/**
 * Get complete network configuration with custom derivation index
 * @deprecated Use getNetworkConfig(networkId, derivationIndex) instead
 */
export function getNetworkConfigWithIndex(networkId: NetworkId, derivationIndex: number = 0): NetworkConfig | null {
  return getNetworkConfig(networkId, derivationIndex);
}
