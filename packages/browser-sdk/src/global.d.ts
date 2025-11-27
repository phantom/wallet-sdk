// Global TypeScript declarations for Wallet Standard and EIP-6963

// Wallet Standard and EIP-6963 type declarations
declare global {
  // Legacy fallback for wallets that haven't implemented EIP-6963
  interface Window {
    ethereum?: {
      providerName?: string;
      name?: string;
      request?: (args: { method: string; params?: any[] }) => Promise<any>;
      [key: string]: any;
    };
  }

  // Wallet Standard API
  interface Navigator {
    wallets?: {
      getWallets?: () => Promise<any[]>;
    };
  }
}

// Make this file a module
export {};
