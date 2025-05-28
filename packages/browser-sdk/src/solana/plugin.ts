import type { ChainPlugin } from "../index";
import { getProvider } from "./getProvider";
import { signMessage } from "./signMessage";
import { signIn } from "./signIn";
import { signAndSendTransaction } from "./signAndSendTransaction";
import type { PhantomSolanaProvider } from "./types";
import { connect } from "./connect";
import { disconnect } from "./disconnect";
import { onConnect } from "./onConnect";
import { onDisconnect } from "./onDisconnect";

export type Solana = {
  getProvider: () => PhantomSolanaProvider | null;

  connect: typeof connect;
  disconnect: typeof disconnect;

  signMessage: typeof signMessage;
  signIn: typeof signIn;
  signAndSendTransaction: typeof signAndSendTransaction;

  onConnect: typeof onConnect;
  onDisconnect: typeof onDisconnect;
};

const solana: Solana = {
  getProvider,
  connect,
  disconnect,
  signMessage,
  signIn,
  signAndSendTransaction,
  onConnect,
  onDisconnect,
};

export function createSolanaPlugin(): ChainPlugin<Solana> {
  return {
    name: "solana",
    create: () => solana,
  };
}
