import type { Plugin } from "../index";
import { autoConfirmEnable } from "./autoConfirmEnable";
import { autoConfirmDisable } from "./autoConfirmDisable";
import { autoConfirmStatus } from "./autoConfirmStatus";
import { autoConfirmSupportedChains } from "./autoConfirmSupportedChains";

export type PhantomPlugin = {
  autoConfirmEnable: typeof autoConfirmEnable;
  autoConfirmDisable: typeof autoConfirmDisable;
  autoConfirmStatus: typeof autoConfirmStatus;
  autoConfirmSupportedChains: typeof autoConfirmSupportedChains;
};

const phantom: PhantomPlugin = {
  autoConfirmEnable,
  autoConfirmDisable,
  autoConfirmStatus,
  autoConfirmSupportedChains,
};

export function createPhantomPlugin(): Plugin<PhantomPlugin> {
  return {
    name: "phantom",
    create: () => phantom,
  };
}