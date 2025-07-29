import type { Plugin } from "../index";
import { isInstalled } from "./isInstalled";

export type Extension = {
  isInstalled: typeof isInstalled;
};

const extension: Extension = {
  isInstalled,
};

export function createExtensionPlugin(): Plugin<Extension> {
  return {
    name: "extension",
    create: () => extension,
  };
}
