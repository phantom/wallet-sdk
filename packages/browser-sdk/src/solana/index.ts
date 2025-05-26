import type { Solana } from "./plugin";
export { createSolanaPlugin } from "./plugin";

declare module "../index" {
  interface Phantom {
    solana: Solana;
  }
}
