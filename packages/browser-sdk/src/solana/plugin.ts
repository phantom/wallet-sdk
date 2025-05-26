import type { ChainPlugin } from "../index";
import { getProvider } from "./getProvider";
import { signMessage } from "./signMessage";
import { signIn } from "./signIn";
import { signAndSendTransaction } from "./signAndSendTransaction";
import { signAllTransactions } from "./signAllTransactions";
import { signTransaction } from "./signTransaction";
import type { PhantomSolanaProvider } from "./types";

export type Solana = {
  getProvider: () => PhantomSolanaProvider | null;
  signMessage: PhantomSolanaProvider["signMessage"];
  signIn: PhantomSolanaProvider["signIn"];
  signAndSendTransaction: PhantomSolanaProvider["signAndSendTransaction"];
  signAllTransactions: PhantomSolanaProvider["signAllTransactions"];
  signTransaction: PhantomSolanaProvider["signTransaction"];
};

const solana: Solana = {
  getProvider,
  signMessage,
  signIn,
  signAndSendTransaction,
  signAllTransactions,
  signTransaction,
};

export function createSolanaPlugin(): ChainPlugin<Solana> {
  return {
    name: "solana",
    create: () => solana,
  };
}
