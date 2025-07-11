import type { SolanaStrategy } from "./types";
import type { DisplayEncoding, SolanaSignInData } from "../types";
import type { Transaction } from "@solana/transactions";
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

  public async signAndSendTransaction(transaction: Transaction): Promise<{ signature: string; address?: string }> {
    const deeplink = `phantom://sign-and-send-transaction?transaction=${transaction}`;
    window.location.href = deeplink;
    return Promise.resolve({
      signature: "",
      address: "",
    });
  }

  public async signTransaction(transaction: Transaction): Promise<Transaction> {
    const deeplink = `phantom://sign-transaction?transaction=${transaction}`;
    window.location.href = deeplink;
    return Promise.resolve(transaction);
  }

  public async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const deeplink = `phantom://sign-all-transactions?transactions=${transactions}`;
    window.location.href = deeplink;
    return Promise.resolve(transactions);
  }
}
