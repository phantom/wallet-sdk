import type { PhantomPlugin } from "./plugin";
export { createPhantomPlugin } from "./plugin";
export type { NetworkID, AutoConfirmEnableParams, AutoConfirmResult, AutoConfirmSupportedChainsResult } from "./types";

declare module "../index" {
  interface Phantom {
    phantom: PhantomPlugin;
  }
}