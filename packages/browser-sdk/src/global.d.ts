// Global TypeScript declarations for Wallet Standard and EIP-6963

declare global {
  // Wallet Standard API
  interface Navigator {
    wallets?: {
      getWallets?: () => Promise<any[]>;
    };
  }
}

// Make this file a module
export {};
