import { BrowserSDK } from "@phantom/browser-sdk";
import type { PhantomSDKConfig } from "@phantom/react-sdk";
import {
  SOLANA_CHAINS,
  SolanaSignAndSendTransaction,
  SolanaSignMessage,
  SolanaSignTransaction,
  type SolanaSignAndSendTransactionFeature,
  type SolanaSignAndSendTransactionMethod,
  type SolanaSignMessageFeature,
  type SolanaSignMessageMethod,
  type SolanaSignTransactionFeature,
  type SolanaSignTransactionMethod,
} from "@solana/wallet-standard";
import { Transaction } from "@solana/web3.js";
import type {
  StandardConnectFeature,
  StandardConnectMethod,
  StandardDisconnectFeature,
  StandardDisconnectMethod,
  StandardEventsFeature,
  Wallet,
} from "@wallet-standard/core";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import bs58 from "bs58";

import { AbstractWallet } from "./abstract";

type Features = StandardConnectFeature &
  StandardDisconnectFeature &
  StandardEventsFeature &
  SolanaSignAndSendTransactionFeature &
  SolanaSignTransactionFeature &
  SolanaSignMessageFeature;

export class EmbeddedWallet extends AbstractWallet implements Wallet {
  readonly #name: Wallet["name"] = "Embedded Wallet";
  readonly #icon: Wallet["icon"] =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiB2aWV3Qm94PSIwIDAgMTA4IDEwOCIgZmlsbD0ibm9uZSI+CjxyZWN0IHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiByeD0iMjYiIGZpbGw9IiNBQjlGRjIiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik00Ni41MjY3IDY5LjkyMjlDNDIuMDA1NCA3Ni44NTA5IDM0LjQyOTIgODUuNjE4MiAyNC4zNDggODUuNjE4MkMxOS41ODI0IDg1LjYxODIgMTUgODMuNjU2MyAxNSA3NS4xMzQyQzE1IDUzLjQzMDUgNDQuNjMyNiAxOS44MzI3IDcyLjEyNjggMTkuODMyN0M4Ny43NjggMTkuODMyNyA5NCAzMC42ODQ2IDk0IDQzLjAwNzlDOTQgNTguODI1OCA4My43MzU1IDc2LjkxMjIgNzMuNTMyMSA3Ni45MTIyQzcwLjI5MzkgNzYuOTEyMiA2OC43MDUzIDc1LjEzNDIgNjguNzA1MyA3Mi4zMTRDNjguNzA1MyA3MS41NzgzIDY4LjgyNzUgNzAuNzgxMiA2OS4wNzE5IDY5LjkyMjlDNjUuNTg5MyA3NS44Njk5IDU4Ljg2ODUgODEuMzg3OCA1Mi41NzU0IDgxLjM4NzhDNDcuOTkzIDgxLjM4NzggNDUuNjcxMyA3OC41MDYzIDQ1LjY3MTMgNzQuNDU5OEM0NS42NzEzIDcyLjk4ODQgNDUuOTc2OCA3MS40NTU2IDQ2LjUyNjcgNjkuOTIyOVpNODMuNjc2MSA0Mi41Nzk0QzgzLjY3NjEgNDYuMTcwNCA4MS41NTc1IDQ3Ljk2NTggNzkuMTg3NSA0Ny45NjU4Qzc2Ljc4MTYgNDcuOTY1OCA3NC42OTg5IDQ2LjE3MDQgNzQuNjk4OSA0Mi41Nzk0Qzc0LjY5ODkgMzguOTg4NSA3Ni43ODE2IDM3LjE5MzEgNzkuMTg3NSAzNy4xOTMxQzgxLjU1NzUgMzcuMTkzMSA4My42NzYxIDM4Ljk4ODUgODMuNjc2MSA0Mi41Nzk0Wk03MC4yMTAzIDQyLjU3OTVDNzAuMjEwMyA0Ni4xNzA0IDY4LjA5MTYgNDcuOTY1OCA2NS43MjE2IDQ3Ljk2NThDNjMuMzE1NyA0Ny45NjU4IDYxLjIzMyA0Ni4xNzA0IDYxLjIzMyA0Mi41Nzk1QzYxLjIzMyAzOC45ODg1IDYzLjMxNTcgMzcuMTkzMSA2NS43MjE2IDM3LjE5MzFDNjguMDkxNiAzNy4xOTMxIDcwLjIxMDMgMzguOTg4NSA3MC4yMTAzIDQyLjU3OTVaIiBmaWxsPSIjRkZGREY4Ii8+Cjwvc3ZnPg==";

  readonly #sdk: BrowserSDK;

  #accounts: Wallet["accounts"] = [];

  constructor(config: PhantomSDKConfig) {
    super();

    this.#sdk = new BrowserSDK(config);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.#sdk.solana.on("connect", publicKey => {
      this.#accounts = [
        {
          address: publicKey,
          publicKey: bs58.decode(publicKey),
          chains: this.chains,
          features: Object.keys(this.features) as Array<keyof Features>,
        },
      ];

      this._emit("change", { accounts: this.#accounts, chains: this.chains, features: this.features });
    });

    this.#sdk.solana.on("disconnect", () => {
      this.#accounts = [];

      this._emit("change", { accounts: this.#accounts, chains: this.chains, features: this.features });
    });
  }

  get name(): Wallet["name"] {
    return this.#name;
  }

  get icon(): Wallet["icon"] {
    return this.#icon;
  }

  get chains(): Wallet["chains"] {
    return SOLANA_CHAINS;
  }

  get accounts(): Wallet["accounts"] {
    return this.#accounts;
  }

  get features(): Features {
    return {
      [StandardConnect]: {
        version: "1.0.0",
        connect: this.#connect,
      },
      [StandardDisconnect]: {
        version: "1.0.0",
        disconnect: this.#disconnect,
      },
      [StandardEvents]: {
        version: "1.0.0",
        on: this._on,
      },
      [SolanaSignAndSendTransaction]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy"],
        signAndSendTransaction: this.#signAndSendTransaction,
      },
      [SolanaSignTransaction]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy"],
        signTransaction: this.#signTransaction,
      },
      [SolanaSignMessage]: {
        version: "1.0.0",
        signMessage: this.#signMessage,
      },
    };
  }

  readonly #connect: StandardConnectMethod = async ({ silent } = {}) => {
    if (!silent && !confirm("Do you want to connect?")) {
      throw new Error("connection declined");
    }

    await this.#sdk.solana.connect();

    return {
      accounts: this.#accounts,
    };
  };

  readonly #disconnect: StandardDisconnectMethod = async () => {
    await this.#sdk.solana.disconnect();
  };

  readonly #signAndSendTransaction: SolanaSignAndSendTransactionMethod = async (...inputs) => {
    return await Promise.all(
      inputs.map(async ({ transaction, account, chain, options: _options }) => {
        if (!account.features.includes(SolanaSignAndSendTransaction)) {
          throw new Error("invalid feature");
        }

        if (!this.chains.includes(chain)) {
          throw new Error("invalid chain");
        }

        const { signature } = await this.#sdk.solana.signAndSendTransaction(Transaction.from(transaction));

        return {
          signature: bs58.decode(signature),
        };
      }),
    );
  };

  readonly #signTransaction: SolanaSignTransactionMethod = async (...inputs) => {
    return await Promise.all(
      inputs.map(async ({ transaction, account, chain }) => {
        if (!account.features.includes(SolanaSignTransaction)) {
          throw new Error("invalid feature");
        }

        if (chain && !this.chains.includes(chain)) {
          throw new Error("invalid chain");
        }

        const signedTransaction = await this.#sdk.solana.signTransaction(Transaction.from(transaction));

        return {
          signedTransaction: new Uint8Array(
            signedTransaction.serialize({
              requireAllSignatures: false,
            }),
          ),
        };
      }),
    );
  };

  readonly #signMessage: SolanaSignMessageMethod = async (...inputs) => {
    return await Promise.all(
      inputs.map(async ({ account, message }) => {
        if (!account.features.includes(SolanaSignMessage)) {
          throw new Error("invalid feature");
        }

        const { signature } = await this.#sdk.solana.signMessage(message);

        return {
          signedMessage: message,
          signature,
        };
      }),
    );
  };
}
