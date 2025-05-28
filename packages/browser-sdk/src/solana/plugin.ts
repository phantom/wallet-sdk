import type { ChainPlugin } from "../index";
import { getProvider } from "./getProvider";
import { signMessage } from "./signMessage";
import { signIn } from "./signIn";
import { signAndSendTransaction } from "./signAndSendTransaction";
import type { PhantomSolanaProvider, PhantomEventType } from "./types";
import { connect } from "./connect";
import { disconnect } from "./disconnect";
import { addEventListener, removeEventListener, type PhantomEventCallback } from "./eventListeners";

export type Solana = {
  getProvider: () => PhantomSolanaProvider | null;

  connect: typeof connect;
  disconnect: typeof disconnect;

  signMessage: typeof signMessage;
  signIn: typeof signIn;
  signAndSendTransaction: typeof signAndSendTransaction;

  addEventListener: (event: PhantomEventType, callback: PhantomEventCallback) => () => void;
  removeEventListener: (event: PhantomEventType, callback: PhantomEventCallback) => void;
};

const solana: Solana = {
  getProvider,
  connect,
  disconnect,
  signMessage,
  signIn,
  signAndSendTransaction,
  addEventListener,
  removeEventListener,
};

export function createSolanaPlugin(): ChainPlugin<Solana> {
  return {
    name: "solana",
    create: () => solana,
  };
}
