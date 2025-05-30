import type { ChainPlugin } from "../index";
import { getProvider } from "./getProvider";
import { signMessage } from "./signMessage";
import { signIn } from "./signIn";
import { signAndSendTransaction } from "./signAndSendTransaction";
import type { PhantomSolanaProvider } from "./types";
import { connect } from "./connect";
import { disconnect } from "./disconnect";
import { getAccount } from "./getAccount";

export type Solana = {
  getProvider: () => PhantomSolanaProvider | null;

  connect: typeof connect;
  disconnect: typeof disconnect;

  getAccount: typeof getAccount;

  signMessage: typeof signMessage;
  signIn: typeof signIn;
  signAndSendTransaction: typeof signAndSendTransaction;
};

const solana: Solana = {
  getProvider,
  connect,
  disconnect,
  getAccount,
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
