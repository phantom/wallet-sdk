import type { Plugin } from "../index";
import { connect } from "./connect";
import { disconnect } from "./disconnect";
import {
  addEventListener,
  removeEventListener,
  triggerEvent,
  type PhantomEthereumEventCallback,
} from "./eventListeners";
import { getAccounts } from "./getAccounts";
import { signMessage, signPersonalMessage, signTypedData } from "./signMessage";
import { signIn } from "./signIn";
import { sendTransaction, signTransaction } from "./sendTransaction";
import { getChainId, switchChain } from "./chainUtils";
import { getProvider } from "./getProvider";
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
  getProvider: typeof getProvider;
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
  getProvider,
  addEventListener,
  removeEventListener,
};

async function bindProviderEvents(): Promise<void> {
  try {
    const strategy = await getProvider();
    const provider = strategy.getProvider();

    if (provider) {
      provider.on("connect", () => {
        provider
          .request({ method: "eth_accounts" })
          .then((accounts: string[]) => {
            if (accounts?.length > 0) triggerEvent("connect", accounts);
          })
          .catch(() => {});
      });
      provider.on("disconnect", () => triggerEvent("disconnect", []));
      provider.on("accountsChanged", (accounts: string[]) => triggerEvent("accountsChanged", accounts));
      provider.on("chainChanged", (chainId: string) => triggerEvent("chainChanged", chainId));
    }
  } catch (error) {
    // Silently ignore if native provider unavailable
  }
}

export function createEthereumPlugin(): Plugin<Ethereum> {
  return {
    name: "ethereum",
    create: () => {
      // Bind events asynchronously without waiting for completion
      bindProviderEvents();
      return ethereum;
    },
  };
}
