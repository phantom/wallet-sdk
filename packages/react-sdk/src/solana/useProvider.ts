import { getProvider } from "@phantom/browser-sdk/solana";

export function useProvider() {
  return getProvider();
}
