import type { Plugin } from "../index";
import { autoConfirmEnable } from "./autoConfirmEnable";
import { autoConfirmDisable } from "./autoConfirmDisable";
import { autoConfirmStatus } from "./autoConfirmStatus";
import { autoConfirmSupportedChains } from "./autoConfirmSupportedChains";

export type AutoConfirmPlugin = {
  autoConfirmEnable: typeof autoConfirmEnable;
  autoConfirmDisable: typeof autoConfirmDisable;
  autoConfirmStatus: typeof autoConfirmStatus;
  autoConfirmSupportedChains: typeof autoConfirmSupportedChains;
};

const autoConfirm: AutoConfirmPlugin = {
  autoConfirmEnable,
  autoConfirmDisable,
  autoConfirmStatus,
  autoConfirmSupportedChains,
};

export function createAutoConfirmPlugin(): Plugin<AutoConfirmPlugin> {
  return {
    name: "autoConfirm",
    create: () => autoConfirm,
  };
}
