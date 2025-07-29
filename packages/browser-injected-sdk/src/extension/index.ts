import type { Extension } from "./plugin";
export { createExtensionPlugin } from "./plugin";

declare module "../index" {
  interface Phantom {
    extension: Extension;
  }
}
