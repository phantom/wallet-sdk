import type { Solana } from "./plugin";
export { createSolanaPlugin } from "./plugin";
export type { Solana } from "./plugin";
export type { PhantomSolanaProvider, SolanaSignInData } from "./types";

declare module "../index" {
  interface Phantom {
    solana: Solana;
  }
}
