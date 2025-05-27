import { Solana } from "./solana/plugin";

export type ChainPlugin<T> = {
  name: string;
  create: () => T;
};

export type CreatePhantomConfig = {
  chainPlugins?: ChainPlugin<unknown>[];
};

// Base interface that plugins will extend via declaration merging
export interface Phantom {
  solana: Solana;
}

/**
 * Creates a Phantom instance with the provided chain plugins.
 * Each plugin extends the Phantom interface via declaration merging.
 */
export function createPhantom({ chainPlugins = [] }: CreatePhantomConfig): Phantom {
  const phantom: Record<string, unknown> = {};

  for (const plugin of chainPlugins) {
    phantom[plugin.name] = plugin.create();
  }

  return phantom as unknown as Phantom;
}
