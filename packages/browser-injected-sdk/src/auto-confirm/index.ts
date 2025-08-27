import type { AutoConfirmPlugin } from "./plugin";
export { createAutoConfirmPlugin } from "./plugin";
export type { AutoConfirmPlugin } from "./plugin";
export type { AutoConfirmEnableParams, AutoConfirmResult, AutoConfirmSupportedChainsResult } from "./types";

declare module "../index" {
  interface Phantom {
    autoConfirm: AutoConfirmPlugin;
  }
}
