import { type Extension } from "./extension/plugin";
import { type Solana } from "./solana/plugin";
import { type AutoConfirmPlugin } from "./auto-confirm/plugin";

export type Plugin<T> = {
  name: string;
  create: () => T;
};

export type CreatePhantomConfig = {
  plugins?: Plugin<Solana | Extension | AutoConfirmPlugin>[];
};

// Base interface that plugins will extend via declaration merging
export interface Phantom {}

/**
 * Creates a Phantom instance with the provided plugins.
 * Each plugin extends the Phantom interface via declaration merging.
 */
export function createPhantom({ plugins = [] }: CreatePhantomConfig): Phantom {
  const phantom: Record<string, unknown> = {};

  for (const plugin of plugins) {
    phantom[plugin.name] = plugin.create();
  }

  return phantom as unknown as Phantom;
}
