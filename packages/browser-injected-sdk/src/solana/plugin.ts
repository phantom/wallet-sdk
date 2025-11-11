import type { Plugin } from "../index";
import { connect } from "./connect";
import { disconnect } from "./disconnect";
import { addEventListener, removeEventListener, triggerEvent, type PhantomEventCallback } from "./eventListeners";
import { getAccount } from "./getAccount";
import { signAndSendTransaction } from "./signAndSendTransaction";
import { signAndSendAllTransactions } from "./signAndSendAllTransactions";
import { signTransaction } from "./signTransaction";
import { signAllTransactions } from "./signAllTransactions";
import { signIn } from "./signIn";
import { signMessage } from "./signMessage";
import { getProvider } from "./getProvider";
import type { PhantomEventType } from "./types";

export type Solana = {
  connect: typeof connect;
  disconnect: typeof disconnect;
  getAccount: typeof getAccount;
  signMessage: typeof signMessage;
  signIn: typeof signIn;
  signTransaction: typeof signTransaction;
  signAllTransactions: typeof signAllTransactions;
  signAndSendTransaction: typeof signAndSendTransaction;
  signAndSendAllTransactions: typeof signAndSendAllTransactions;
  addEventListener: (event: PhantomEventType, callback: PhantomEventCallback) => () => void;
  removeEventListener: (event: PhantomEventType, callback: PhantomEventCallback) => void;
};

const solana: Solana = {
  connect,
  disconnect,
  getAccount,
  signMessage,
  signIn,
  signTransaction,
  signAllTransactions,
  signAndSendTransaction,
  signAndSendAllTransactions,
  addEventListener,
  removeEventListener,
};

async function bindProviderEvents(): Promise<void> {
  try {
    const strategy = await getProvider();
    const provider = strategy.getProvider();

    if (provider) {
      provider.on("connect", (publicKey?: { toString: () => string }) => {
        if (publicKey) triggerEvent("connect", publicKey.toString());
      });
      provider.on("disconnect", () => triggerEvent("disconnect"));
      provider.on("accountChanged", (publicKey?: { toString: () => string }) => {
        if (publicKey) triggerEvent("accountChanged", publicKey.toString());
      });
    }
  } catch (error) {
    // Silently ignore if native provider unavailable
  }
}

export function createSolanaPlugin(): Plugin<Solana> {
  return {
    name: "solana",
    create: () => {
      // Bind events asynchronously without waiting for completion
      bindProviderEvents();
      return solana;
    },
  };
}
