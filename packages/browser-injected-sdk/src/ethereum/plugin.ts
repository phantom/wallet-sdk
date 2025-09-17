import type { Plugin } from "../index";
import { connect } from "./connect";
import { disconnect } from "./disconnect";
import { addEventListener, removeEventListener, triggerEvent, type PhantomEthereumEventCallback } from "./eventListeners";
import { getAccounts } from "./getAccounts";
import { signMessage, signPersonalMessage, signTypedData } from "./signMessage";
import { signIn } from "./signIn";
import { sendTransaction, signTransaction } from "./sendTransaction";
import { getChainId, switchChain } from "./chainUtils";
import { getProvider } from "./getProvider";
import type { EthereumEventType, PhantomEthereumProvider } from "./types";

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

export function createEthereumPlugin(): Plugin<Ethereum> {
  return {
    name: "ethereum",
    create: () => {
      // Forward native provider events to browser-injected-sdk events
      try {
        const provider = (window as any)?.phantom?.ethereum as PhantomEthereumProvider;
        if (provider) {
          provider.on("connect", () => {
            provider.request({ method: "eth_accounts" }).then((accounts: string[]) => {
              if (accounts?.length > 0) triggerEvent("connect", accounts);
            }).catch(() => {});
          });
          provider.on("disconnect", () => triggerEvent("disconnect", []));
          provider.on("accountsChanged", (accounts: string[]) => triggerEvent("accountsChanged", accounts));
          provider.on("chainChanged", (chainId: string) => triggerEvent("chainChanged", chainId));
        }
      } catch (error) {
        // Silently ignore if native provider unavailable
      }
      return ethereum;
    },
  };
}
