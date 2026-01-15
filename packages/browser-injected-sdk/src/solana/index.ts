export { createSolanaPlugin } from "./plugin";
export type { PhantomSolanaProvider, SolanaSignInData } from "./types";
import type { ISolanaChain } from "@phantom/chain-interfaces";

declare module "../index" {
  interface Phantom {
    solana: ISolanaChain;
  }
}
