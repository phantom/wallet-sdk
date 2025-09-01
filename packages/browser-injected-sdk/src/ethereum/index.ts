import type { Ethereum } from "./plugin";
export { createEthereumPlugin } from "./plugin";
export type { Ethereum } from "./plugin";
export type { PhantomEthereumProvider, EthereumTransaction, EthereumSignInData, EthereumEventType } from "./types";

declare module "../index" {
  interface Phantom {
    ethereum: Ethereum;
  }
}
