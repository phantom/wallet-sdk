import { getProvider as defaultGetProvider } from "./getProvider";
import type { SolanaOperationOptions } from "./types";

export async function disconnect(operationOptions?: SolanaOperationOptions) {
  const getProviderFn = operationOptions?.getProvider || defaultGetProvider;
  const provider = getProviderFn();
  if (!provider) {
    throw new Error("Phantom provider not found.");
  }

  await provider.disconnect();
}
