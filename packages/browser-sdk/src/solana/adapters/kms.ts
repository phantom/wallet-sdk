import type { SolanaAdapter } from "./types";
import type { DisplayEncoding, SolanaSignInData } from "../types";
import type { Transaction } from "@solana/transactions";

// TODO: Replace with the actual API URL
const API_URL = "https://api.phantom.app/v1/wallet";

export class KmsSolanaAdapter implements SolanaAdapter {
  load() {
    // TODO: when loading we probably want to restore some local storage JWT token, to make sure that the user is still connected
    // load the JWT token from local storage
    // call the API to verify the token is still valid, if not discard or refresh it.

    return Promise.resolve(this);
  }

  #getJwtToken() {
    // TODO: load the JWT token from local storage
    return localStorage.getItem("phantom-solana-kms-jwt");
  }

  public get isConnected(): boolean {
    // TODO: Check if we need to call the API to get a isconnected
    return false;
  }

  public async connect({ onlyIfTrusted }: { onlyIfTrusted: boolean }): Promise<string | undefined> {
    // Call the API to see if the app is approved to use the wallet
    return fetch(`${API_URL}/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#getJwtToken()}`,
      },
      body: JSON.stringify({
        onlyIfTrusted,
      }),
    })
      .then(res => res.json())
      .then(data => data.publicKey as string);
  }

  public async disconnect(): Promise<void> {
    // Call the API to disconnect the wallet
    const response = await fetch(`${API_URL}/disconnect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#getJwtToken()}`,
      },
    })
      .then(res => res.json())
      .then(data => data.disconnected as boolean);

    if (!response) {
      throw new Error("Failed to disconnect wallet.");
    }

    return;
  }

  public async getAccount(): Promise<string | undefined> {
    // Call the API to get the account
    return fetch(`${API_URL}/account`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#getJwtToken()}`,
      },
    })
      .then(res => res.json())
      .then(data => data.publicKey as string);
  }

  public async signMessage(
    message: Uint8Array,
    display?: DisplayEncoding,
  ): Promise<{ signature: Uint8Array; address: string }> {
    // Call the API to sign the message
    return fetch(`${API_URL}/sign-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#getJwtToken()}`,
      },
      body: JSON.stringify({
        message,
        display,
      }),
    })
      .then(res => res.json())
      .then(data => {
        return {
          signature: new Uint8Array(Buffer.from(data.signature as string, "base64")),
          address: data.publicKey as string,
        };
      });
  }

  public async signIn(
    signInData: SolanaSignInData,
  ): Promise<{ address: string; signature: Uint8Array; signedMessage: Uint8Array }> {
    // Call the API to sign the message
    return fetch(`${API_URL}/sign-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#getJwtToken()}`,
      },
      body: JSON.stringify({
        signInData,
      }),
    })
      .then(res => res.json())
      .then(data => {
        return {
          address: data.address as string,
          signature: new Uint8Array(Buffer.from(data.signature, "base64")),
          signedMessage: new Uint8Array(Buffer.from(data.signedMessage, "base64")),
        };
      });
  }

  public async signAndSendTransaction(transaction: Transaction): Promise<{ signature: string; address?: string }> {
    // Call the API to sign the transaction
    return fetch(`${API_URL}/sign-and-send-transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#getJwtToken()}`,
      },
      body: JSON.stringify({
        transaction,
      }),
    })
      .then(res => res.json())
      .then(data => {
        return {
          signature: data.signature as string,
          address: data.publicKey as string,
        };
      });
  }

  public async signTransaction(transaction: Transaction): Promise<Transaction> {
    // Call the API to sign the transaction
    return fetch(`${API_URL}/sign-transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#getJwtToken()}`,
      },
      body: JSON.stringify({
        transaction,
      }),
    })
      .then(res => res.json())
      .then(data => {
        return data as Transaction;
      });
  }

  public async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    // Call the API to sign all transactions
    return fetch(`${API_URL}/sign-all-transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#getJwtToken()}`,
      },
      body: JSON.stringify({
        transactions,
      }),
    })
      .then(res => res.json())
      .then(data => {
        return data as Transaction[];
      });
  }
}
