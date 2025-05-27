import type { ChainPlugin } from "../index";
import { getProvider } from "./getProvider";
import { signMessage } from "./signMessage";
import { signIn } from "./signIn";
import { signAndSendTransaction } from "./signAndSendTransaction";
import type { PhantomSolanaProvider } from "./types";
import { connect } from "./connect";
import { disconnect } from "./disconnect";

export type Solana = {
  getProvider: () => PhantomSolanaProvider | null;

  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  signMessage: typeof signMessage;
  signIn: typeof signIn;
  signAndSendTransaction: typeof signAndSendTransaction;
};

const solana: Solana = {
  getProvider,
  connect,
  disconnect,
  signMessage,
  signIn,
  signAndSendTransaction,
};

export function createSolanaPlugin(): ChainPlugin<Solana> {
  return {
    name: "solana",
    create: () => solana,
  };
}
