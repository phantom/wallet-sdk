/**
 * Network utility functions for working with blockchain network identifiers
 */

export function isEthereumChain(networkId: string): boolean {
  const network = networkId.split(":")[0].toLowerCase();
  return network === "eip155";
}

export function getChainPrefix(networkId: string): string {
  return networkId.split(":")[0].toLowerCase();
}
