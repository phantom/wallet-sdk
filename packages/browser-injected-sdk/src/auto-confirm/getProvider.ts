import type { PhantomProvider } from "./types";
import { PHANTOM_NOT_DETECTED, APP_PROVIDER_NOT_FOUND } from "../errors";
import { isInstalled } from "../extension/isInstalled";

export function getProvider(): PhantomProvider {
  if (!isInstalled()) {
    throw new Error(PHANTOM_NOT_DETECTED);
  }

  const provider = (window as any).phantom.app;

  if (!provider) {
    throw new Error(APP_PROVIDER_NOT_FOUND);
  }

  return provider;
}
