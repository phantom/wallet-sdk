import type { SolanaAdapter } from "./types";
import type { DisplayEncoding, PhantomSolanaProvider, SolanaSignInData, VersionedTransaction } from "../types";
import type { Transaction } from "@solana/transactions";
import { transactionToVersionedTransaction } from "../utils/transactionToVersionedTransaction";
import { fromVersionedTransaction } from "@solana/compat";

export class InjectedSolanaAdapter implements SolanaAdapter {
  #getProvider(): PhantomSolanaProvider {
    return (window as any)?.phantom?.solana as PhantomSolanaProvider;
  }

  public get isConnected(): boolean {
    const provider = this.#getProvider();
    return provider?.isConnected && provider.publicKey ? true : false;
  }

  public async connect({ onlyIfTrusted }: { onlyIfTrusted: boolean }): Promise<string | undefined> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Phantom provider not found.");
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
      throw new Error("Phantom provider not found.");
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
      throw new Error("Phantom provider not found.");
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
      throw new Error("Phantom provider not found.");
    }

    const result = await provider.signIn(signInData);
    return {
      address: result.address.toString(),
      signature: result.signature,
      signedMessage: result.signedMessage,
    };
  }

  public async signAndSendTransaction(transaction: Transaction): Promise<{ signature: string; address?: string }> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Phantom provider not found.");
    }

    if (!provider.isConnected) {
      throw new Error("Provider is not connected.");
    }

    // Convert the Kit transaction into a web3.js VersionedTransaction before sending.
    const versionedTransaction: VersionedTransaction = transactionToVersionedTransaction(transaction);
    const result = await provider.signAndSendTransaction(versionedTransaction);
    return {
      signature: result.signature,
      address: result.publicKey,
    };
  }

  public async signTransaction(transaction: Transaction): Promise<Transaction> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Phantom provider not found.");
    }

    if (!provider.isConnected) {
      throw new Error("Provider is not connected.");
    }

    // Convert the Kit transaction into a web3.js VersionedTransaction before sending.
    const versionedTransaction: VersionedTransaction = transactionToVersionedTransaction(transaction);
    const result = await provider.signTransaction(versionedTransaction);
    const responseTransaction = fromVersionedTransaction(result as any);
    return responseTransaction;
  }

  public async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const provider = this.#getProvider();
    if (!provider) {
      throw new Error("Phantom provider not found.");
    }

    if (!provider.isConnected) {
      throw new Error("Provider is not connected.");
    }

    // Convert the Kit transaction into a web3.js VersionedTransaction before sending.
    const versionedTransactions: VersionedTransaction[] = transactions.map(transaction =>
      transactionToVersionedTransaction(transaction),
    );
    const result = await provider.signAllTransactions(versionedTransactions);
    const responseTransactions = result.map(transaction => fromVersionedTransaction(transaction as any));
    return responseTransactions;
  }
}
