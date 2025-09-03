export type Plugin<T> = {
  name: string;
  create: () => T;
};

export type CreatePhantomConfig = {
  plugins?: Plugin<unknown>[];
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

// Export extension functionality
export { createExtensionPlugin, type Extension } from "./extension";

// Export Ethereum functionality
export { createEthereumPlugin } from "./ethereum";

export { isInstalled as isPhantomExtensionInstalled } from "./extension/isInstalled";
