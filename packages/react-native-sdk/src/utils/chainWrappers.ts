/**
 * Wraps a chain with connection enforcement for specified methods
 */
export function wrapChainWithConnectionEnforcement<T extends { isConnected(): boolean }>(
  chain: T,
  getSdk: () => any,
  methodsToWrap: string[]
): T {
  if (!chain) return chain;
  
  // Create property descriptors for methods that need connection enforcement
  const overrides: PropertyDescriptorMap = {};
  
  for (const methodName of methodsToWrap) {
    const originalMethod = chain[methodName as keyof T];
    if (typeof originalMethod === 'function') {
      overrides[methodName] = {
        value: async function(...args: any[]) {
          const sdk = getSdk();
          if (!sdk) throw new Error("Phantom SDK not initialized.");
          if (!sdk.isConnected()) throw new Error("Phantom SDK not connected. Call connect() first.");
          return originalMethod.apply(chain, args);
        },
        writable: true,
        enumerable: true,
        configurable: true
      };
    }
  }
  
  // Create new object with overridden methods
  return Object.assign(Object.create(Object.getPrototypeOf(chain)), chain, overrides);
}

// Define which methods require connection enforcement
export const SOLANA_SIGNING_METHODS = [
  "signMessage",
  "signTransaction", 
  "signAndSendTransaction",
  "signAllTransactions"
];

export const ETHEREUM_SIGNING_METHODS = [
  "signPersonalMessage",
  "signTypedData",
  "signTransaction",
  "sendTransaction"
];