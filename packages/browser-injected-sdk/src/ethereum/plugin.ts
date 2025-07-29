import type { Plugin } from "../index";
import { connect } from "./connect";
import { disconnect } from "./disconnect";
import { addEventListener, removeEventListener, type PhantomEthereumEventCallback } from "./eventListeners";
import { getAccounts } from "./getAccounts";
import { signMessage, signPersonalMessage, signTypedData } from "./signMessage";
import { signIn } from "./signIn";
import { sendTransaction, signTransaction } from "./sendTransaction";
import { getChainId, switchChain } from "./chainUtils";
import type { EthereumEventType } from "./types";

export type Ethereum = {
  connect: typeof connect;
  disconnect: typeof disconnect;
  getAccounts: typeof getAccounts;
  signMessage: typeof signMessage;
  signPersonalMessage: typeof signPersonalMessage;
  signTypedData: typeof signTypedData;
  signIn: typeof signIn;
  sendTransaction: typeof sendTransaction;
  signTransaction: typeof signTransaction;
  getChainId: typeof getChainId;
  switchChain: typeof switchChain;
  addEventListener: (event: EthereumEventType, callback: PhantomEthereumEventCallback) => () => void;
  removeEventListener: (event: EthereumEventType, callback: PhantomEthereumEventCallback) => void;
};

const ethereum: Ethereum = {
  connect,
  disconnect,
  getAccounts,
  signMessage,
  signPersonalMessage,
  signTypedData,
  signIn,
  sendTransaction,
  signTransaction,
  getChainId,
  switchChain,
  addEventListener,
  removeEventListener,
};

export function createEthereumPlugin(): Plugin<Ethereum> {
  return {
    name: "ethereum",
    create: () => ethereum,
  };
}
