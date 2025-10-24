/**
 * Network utility functions for working with blockchain network identifiers
 */

/**
 * Check if a network ID represents an Ethereum-compatible chain
 * @param networkId - Network identifier (e.g., "eip155:1", "solana:mainnet")
 * @returns true if the network is Ethereum-compatible (uses eip155 prefix)
 *
 * @example
 * ```typescript
 * isEthereumChain("eip155:1") // true (Ethereum mainnet)
 * isEthereumChain("eip155:137") // true (Polygon)
 * isEthereumChain("solana:101") // false (Solana)
 * ```
 */
export function isEthereumChain(networkId: string): boolean {
  const network = networkId.split(":")[0].toLowerCase();
  return network === "eip155";
}

/**
 * Get the chain prefix from a network ID
 * @param networkId - Network identifier (e.g., "eip155:1", "solana:mainnet")
 * @returns The chain prefix (e.g., "eip155", "solana")
 *
 * @example
 * ```typescript
 * getChainPrefix("eip155:1") // "eip155"
 * getChainPrefix("solana:mainnet") // "solana"
 * ```
 */
export function getChainPrefix(networkId: string): string {
  return networkId.split(":")[0].toLowerCase();
}
