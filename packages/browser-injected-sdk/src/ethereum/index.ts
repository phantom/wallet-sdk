export { createEthereumPlugin } from "./plugin";
export { createSiweMessage } from "./siwe";
export type { PhantomEthereumProvider, EthereumTransaction, EthereumSignInData, EthereumEventType } from "./types";
import type { IEthereumChain } from "@phantom/chain-interfaces";

declare module "../index" {
  interface Phantom {
    ethereum: IEthereumChain;
  }
}
