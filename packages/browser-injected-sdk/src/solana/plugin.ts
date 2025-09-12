import type { Plugin } from "../index";
import { connect } from "./connect";
import { disconnect } from "./disconnect";
import { addEventListener, removeEventListener, type PhantomEventCallback } from "./eventListeners";
import { getAccount } from "./getAccount";
import { signAndSendTransaction } from "./signAndSendTransaction";
import { signAndSendAllTransactions } from "./signAndSendAllTransactions";
import { signTransaction } from "./signTransaction";
import { signAllTransactions } from "./signAllTransactions";
import { signIn } from "./signIn";
import { signMessage } from "./signMessage";
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

export function createSolanaPlugin(): Plugin<Solana> {
  return {
    name: "solana",
    create: () => solana,
  };
}
