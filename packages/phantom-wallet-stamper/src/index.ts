import type { StamperWithKeyManagement, StamperKeyInfo } from "@phantom/sdk-types";
import { Algorithm } from "@phantom/sdk-types";
import type { Buffer } from "buffer";
import { base64urlEncode } from "@phantom/base64url";
export interface PhantomWalletStamperConfig {
  platform?: "browser" | "mobile" | "auto";
  timeout?: number; // Connection timeout in ms
}

export interface PhantomWalletConnection {
  publicKey: string; // base58 encoded public key
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  disconnect: () => Promise<void>;
}

// Types for window.phantom.solana
interface PhantomSolanaProvider {
  connect(): Promise<{ publicKey: { toString(): string } }>;
  signTransaction(transaction: any): Promise<{ signature: Uint8Array }>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  disconnect(): Promise<void>;
  isConnected: boolean;
  publicKey?: { toString(): string };
}

declare global {
  interface Window {
    phantom?: {
      solana?: PhantomSolanaProvider;
    };
  }
}

export class PhantomWalletStamper implements StamperWithKeyManagement {
  public algorithm: Algorithm = Algorithm.ed25519;
  public type: "PKI" | "OIDC" = "PKI";
  private config: PhantomWalletStamperConfig;
  private connection: PhantomWalletConnection | null = null;
  private stamperInfo: StamperKeyInfo | null = null;

  constructor(config: PhantomWalletStamperConfig = {}) {
    this.config = {
      platform: config.platform || "auto",
      timeout: config.timeout || 30000, // 30 second default timeout
      ...config,
    };
  }

  async init(): Promise<StamperKeyInfo> {
    const platform = this.detectPlatform();
    
    if (platform === "browser") {
      this.connection = await this.connectBrowser();
    } else if (platform === "mobile") {
      this.connection = await this.connectMobile();
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    this.stamperInfo = {
      publicKey: this.connection.publicKey, // Keep base58 for external compatibility
      keyId: `phantom-wallet-${this.connection.publicKey.slice(0, 8)}`,
    };

    return this.stamperInfo;
  }

  async stamp(params: { data: Buffer; type?: "PKI"; idToken?: never; salt?: never } | { data: Buffer; type: "OIDC"; idToken: string; salt: string }): Promise<string> {
    if (!this.connection || !this.stamperInfo) {
      throw new Error("PhantomWalletStamper not initialized. Call init() first.");
    }

    try {
      // Sign the data using the external wallet's private key
      const signature = await this.connection.signMessage(new Uint8Array(params.data));
      
      // Return base64url encoded signature
      return base64urlEncode(signature);
    } catch (error) {
      throw new Error(`Failed to stamp with Phantom wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getKeyInfo(): StamperKeyInfo | null {
    return this.stamperInfo;
  }


  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
      this.stamperInfo = null;
    }
  }

  private detectPlatform(): "browser" | "mobile" {
    if (this.config.platform !== "auto") {
      return this.config.platform!;
    }

    // Detect if we're in a browser environment
    if (typeof window !== "undefined" && window.phantom?.solana) {
      return "browser";
    }

    // Detect mobile environment (React Native or mobile browser)
    if (typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      return "mobile";
    }

    // Default to browser if we can't detect
    return "browser";
  }

  private async connectBrowser(): Promise<PhantomWalletConnection> {
    if (typeof window === "undefined" || !window.phantom?.solana) {
      throw new Error("Phantom wallet extension not found. Please install the Phantom wallet extension.");
    }

    const phantom = window.phantom.solana;
    
    try {
      // Connect to Phantom wallet
      const response = await this.withTimeout(
        phantom.connect(),
        this.config.timeout!,
        "Connection to Phantom wallet timed out"
      );

      const publicKey = response.publicKey.toString();
      return {
        publicKey,
        signMessage: async (message: Uint8Array) => {
          const result = await phantom.signMessage(message);
          return result.signature;
        },
        disconnect: async () => {
          await phantom.disconnect();
        },
      };
    } catch (error) {
      throw new Error(`Failed to connect to Phantom wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private connectMobile(): Promise<PhantomWalletConnection> {
    // For mobile, we'll use deep links to connect to Phantom
    const connectUrl = "phantom://connect";
    
    try {
      // Open Phantom app with deep link
      if (typeof window !== "undefined" && window.location) {
        window.location.href = connectUrl;
      } else {
        throw new Error("Mobile deep linking not supported in this environment");
      }

      // For now, throw an error as mobile implementation needs more work
      // This would require a callback mechanism to receive the connection result
      throw new Error("Mobile Phantom wallet connection not yet implemented. Use browser version instead.");
      
    } catch (error) {
      throw new Error(`Failed to connect to Phantom mobile wallet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeout]);
  }
}