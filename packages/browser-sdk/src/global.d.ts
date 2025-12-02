// Global TypeScript declarations for Wallet Standard and EIP-6963

declare global {
  // Wallet Standard API - can be on navigator or window
  interface Navigator {
    wallets?:
      | {
          getWallets?: () => Promise<any[]>;
        }
      | (() => Promise<any[]>)
      | any[];
  }

  interface Window {
    wallets?:
      | {
          getWallets?: () => Promise<any[]>;
        }
      | (() => Promise<any[]>)
      | any[];
  }
}

// Make this file a module
export {};
