import type { ChainPlugin } from "../index";
import { getProvider } from "./getProvider";
import { signMessage } from "./signMessage";
import { signIn } from "./signIn";
import { signAndSendTransaction } from "./signAndSendTransaction";
import type { PhantomSolanaProvider } from "./types";

export type Solana = {
  getProvider: () => PhantomSolanaProvider | null;
  signMessage: typeof signMessage;
  signIn: typeof signIn;
  signAndSendTransaction: typeof signAndSendTransaction;
};

const solana: Solana = {
  getProvider,
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
