/**
 * Network utility functions for working with blockchain network identifiers
 */

export function getChainPrefix(networkId: string): string {
  return networkId.split(":")[0].toLowerCase();
}

export function isEthereumChain(networkId: string): boolean {
  const network = getChainPrefix(networkId);
  return network === "eip155";
}

export function isSolanaChain(networkId: string): boolean {
  const network = getChainPrefix(networkId);
  return network === "solana";
}
