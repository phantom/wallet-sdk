import type { Plugin } from "../index";
import { connect } from "./connect";
import { disconnect } from "./disconnect";
import { addEventListener, removeEventListener, type PhantomEventCallback } from "./eventListeners";
import { getAccount } from "./getAccount";
import { signAndSendTransaction } from "./signAndSendTransaction";
import { signIn } from "./signIn";
import { signMessage } from "./signMessage";
import type { PhantomEventType } from "./types";

export type Solana = {
  connect: typeof connect;
  disconnect: typeof disconnect;
  getAccount: typeof getAccount;
  signMessage: typeof signMessage;
  signIn: typeof signIn;
  signAndSendTransaction: typeof signAndSendTransaction;
  addEventListener: (event: PhantomEventType, callback: PhantomEventCallback) => () => void;
  removeEventListener: (event: PhantomEventType, callback: PhantomEventCallback) => void;
};

const solana: Solana = {
  connect,
  disconnect,
  getAccount,
  signMessage,
  signIn,
  signAndSendTransaction,
  addEventListener,
  removeEventListener,
};

export function createSolanaPlugin(): Plugin<Solana> {
  return {
    name: "solana",
    create: () => solana,
  };
}
