import type { SolanaStrategy } from "./types";
import type { DisplayEncoding, SolanaSignInData } from "../types";
import type { VersionedTransaction, Transaction } from "@solana/web3.js";
import { ProviderStrategy } from "../../types";

export class DeepLinkSolanaStrategy implements SolanaStrategy {
  type = ProviderStrategy.DEEPLINK;

  load() {
    return Promise.resolve(this);
  }

  public get isConnected(): boolean {
    return true;
  }

  public async connect({ onlyIfTrusted }: { onlyIfTrusted: boolean }): Promise<string | undefined> {
    const deeplink = `phantom://connect?onlyIfTrusted=${onlyIfTrusted}`;
    window.location.href = deeplink;
    return Promise.resolve(undefined);
  }

  public async disconnect(): Promise<void> {
    const deeplink = `phantom://disconnect`;
    window.location.href = deeplink;
    return Promise.resolve();
  }

  public async getAccount(): Promise<string | undefined> {
    const deeplink = `phantom://account`;
    window.location.href = deeplink;
    return Promise.resolve(undefined);
  }

  public async signMessage(
    message: Uint8Array,
    display?: DisplayEncoding,
  ): Promise<{ signature: Uint8Array; address: string }> {
    const messageEncoded = Buffer.from(message).toString("base64");
    const deeplink = `phantom://sign-message?message=${messageEncoded}&display=${display}`;
    window.location.href = deeplink;
    return Promise.resolve({
      signature: new Uint8Array(),
      address: "",
    });
  }

  public async signIn(
    signInData: SolanaSignInData,
  ): Promise<{ address: string; signature: Uint8Array; signedMessage: Uint8Array }> {
    const deeplink = `phantom://sign-in?signInData=${encodeURIComponent(JSON.stringify(signInData))}`;
    window.location.href = deeplink;
    return Promise.resolve({
      address: "",
      signature: new Uint8Array(),
      signedMessage: new Uint8Array(),
    });
  }

  public async signAndSendTransaction(
    transaction: VersionedTransaction | Transaction,
  ): Promise<{ signature: string; address?: string }> {
    // For deeplinks, we need to serialize the transaction
    let serialized: Uint8Array;
    if ("serialize" in transaction && typeof transaction.serialize === "function") {
      serialized = transaction.serialize();
    } else {
      // For legacy Transaction, use serializeMessage or similar
      serialized = (transaction as any).serializeMessage?.() || new Uint8Array();
    }
    const encoded = Buffer.from(serialized).toString("base64");
    const deeplink = `phantom://sign-and-send-transaction?transaction=${encoded}`;
    window.location.href = deeplink;
    return Promise.resolve({
      signature: "",
      address: "",
    });
  }

  public async signTransaction(
    transaction: VersionedTransaction | Transaction,
  ): Promise<VersionedTransaction | Transaction> {
    // For deeplinks, we need to serialize the transaction
    let serialized: Uint8Array;
    if ("serialize" in transaction && typeof transaction.serialize === "function") {
      serialized = transaction.serialize();
    } else {
      // For legacy Transaction, use serializeMessage or similar
      serialized = (transaction as any).serializeMessage?.() || new Uint8Array();
    }
    const encoded = Buffer.from(serialized).toString("base64");
    const deeplink = `phantom://sign-transaction?transaction=${encoded}`;
    window.location.href = deeplink;
    return Promise.resolve(transaction);
  }

  public async signAllTransactions(
    transactions: (VersionedTransaction | Transaction)[],
  ): Promise<(VersionedTransaction | Transaction)[]> {
    // For deeplinks, we need to serialize each transaction
    const serializedTxs = transactions.map(tx => {
      let serialized: Uint8Array;
      if ("serialize" in tx && typeof tx.serialize === "function") {
        serialized = tx.serialize();
      } else {
        // For legacy Transaction, use serializeMessage or similar
        serialized = (tx as any).serializeMessage?.() || new Uint8Array();
      }
      return Buffer.from(serialized).toString("base64");
    });
    const deeplink = `phantom://sign-all-transactions?transactions=${JSON.stringify(serializedTxs)}`;
    window.location.href = deeplink;
    return Promise.resolve(transactions);
  }
}
