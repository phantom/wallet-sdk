import type { SolanaStrategy } from "./types";
import type { DisplayEncoding, PhantomSolanaProvider, SolanaSignInData } from "../types";
import type { Transaction, VersionedTransaction } from "@phantom/sdk-types";
import { ProviderStrategy } from "../../types";
import { PHANTOM_NOT_DETECTED, SOLANA_PROVIDER_NOT_FOUND } from "../../errors";
import { isInstalled } from "../../extension/isInstalled";

const MAX_RETRIES = 6;
const BASE_DELAY = 100;

export class InjectedSolanaStrategy implements SolanaStrategy {
  type = ProviderStrategy.INJECTED;

  load() {
    // We add a backoff retry to see if window.phantom.solana is available
    let retryCount = 0;
    const scheduleRetry = (resolve: () => void, reject: (reason: Error) => void) => {
      const delay = BASE_DELAY * Math.pow(2, Math.min(retryCount, 5));

      setTimeout(() => {
        if (this.#getProvider()) {
          resolve();
          return;
        }

        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          if (!isInstalled()) {
            reject(new Error(PHANTOM_NOT_DETECTED));
          } else {
            reject(new Error(SOLANA_PROVIDER_NOT_FOUND));
          }
        } else {
          scheduleRetry(resolve, reject);
        }
      }, delay);
    };

    return new Promise((resolve, reject) => {
      scheduleRetry(() => resolve(this), reject);
    });
  }

  #getProvider(): PhantomSolanaProvider | undefined {
    if (!isInstalled()) {
      return undefined;
    }
    return (window as any).phantom.solana as PhantomSolanaProvider;
  }

  public getProvider(): PhantomSolanaProvider | null {
    return this.#getProvider() || null;
  }

  public get isConnected(): boolean {
    const provider = this.#getProvider();
    return provider?.isConnected && provider.publicKey ? true : false;
  }

  public async connect({ onlyIfTrusted }: { onlyIfTrusted: boolean }): Promise<string | undefined> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error(SOLANA_PROVIDER_NOT_FOUND);
    }
    if (provider.isConnected && provider.publicKey) {
      return this.getAccount() ?? undefined;
    }
    try {
      const result = await provider.connect({ onlyIfTrusted });
      return result.publicKey.toString();
    } catch (_) {
      return undefined;
    }
  }

  public async disconnect(): Promise<void> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error(SOLANA_PROVIDER_NOT_FOUND);
    }
    await provider.disconnect();
  }

  public async getAccount(): Promise<string | undefined> {
    const provider = this.#getProvider();
    if (provider && provider.isConnected && provider.publicKey) {
      return Promise.resolve(provider.publicKey.toString());
    }
    return Promise.resolve(undefined);
  }

  public async signMessage(
    message: Uint8Array,
    display?: DisplayEncoding,
  ): Promise<{ signature: Uint8Array; address: string }> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error(SOLANA_PROVIDER_NOT_FOUND);
    }

    if (!provider.isConnected) {
      throw new Error("Provider is not connected.");
    }

    const result = await provider.signMessage(message, display);
    return {
      signature: result.signature,
      address: result.publicKey.toString(),
    };
  }

  public async signIn(
    signInData: SolanaSignInData,
  ): Promise<{ address: string; signature: Uint8Array; signedMessage: Uint8Array }> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error(SOLANA_PROVIDER_NOT_FOUND);
    }

    const result = await provider.signIn(signInData);
    return {
      address: result.address.toString(),
      signature: result.signature,
      signedMessage: result.signedMessage,
    };
  }

  public async signAndSendTransaction(
    transaction: Transaction | VersionedTransaction,
  ): Promise<{ signature: string; address?: string }> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error(SOLANA_PROVIDER_NOT_FOUND);
    }

    if (!provider.isConnected) {
      throw new Error("Provider is not connected.");
    }

    const result = await provider.signAndSendTransaction(transaction);
    return {
      signature: result.signature,
      address: result.publicKey,
    };
  }

  public async signAndSendAllTransactions(
    transactions: (Transaction | VersionedTransaction)[],
  ): Promise<{ signatures: string[]; address?: string }> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error(SOLANA_PROVIDER_NOT_FOUND);
    }

    if (!provider.isConnected) {
      throw new Error("Provider is not connected.");
    }

    if (!provider.signAndSendAllTransactions) {
      throw new Error("Provider does not support signAndSendAllTransactions.");
    }

    const results = await provider.signAndSendAllTransactions(transactions);
    return {
      signatures: results.signatures,
      address: results.publicKey,
    };
  }

  public async signTransaction(
    transaction: Transaction | VersionedTransaction,
  ): Promise<Transaction | VersionedTransaction> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error(SOLANA_PROVIDER_NOT_FOUND);
    }

    if (!provider.isConnected) {
      throw new Error("Provider is not connected.");
    }

    const result = await provider.signTransaction(transaction);
    return result;
  }

  public async signAllTransactions(
    transactions: (Transaction | VersionedTransaction)[],
  ): Promise<(Transaction | VersionedTransaction)[]> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error(SOLANA_PROVIDER_NOT_FOUND);
    }

    if (!provider.isConnected) {
      throw new Error("Provider is not connected.");
    }

    const result = await provider.signAllTransactions(transactions);
    return result;
  }
}
