import type { AutoConfirmPlugin } from "./plugin";
export { createAutoConfirmPlugin } from "./plugin";
export type { NetworkID, AutoConfirmEnableParams, AutoConfirmResult, AutoConfirmSupportedChainsResult } from "./types";

declare module "../index" {
  interface Phantom {
    autoConfirm: AutoConfirmPlugin;
  }
}
