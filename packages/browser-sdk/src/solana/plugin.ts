import type { ChainPlugin } from "../index";
import { getProvider } from "./getProvider";

export type Solana = {
  getProvider: () => Promise<unknown>;
};

const solana: Solana = {
  getProvider,
};

export function createSolanaPlugin(): ChainPlugin<Solana> {
  return {
    name: "solana",
    create: () => solana,
  };
}
