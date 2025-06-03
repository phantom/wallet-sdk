import { getProvider } from "./getProvider";

export function getAccount(): Promise<string | undefined> {
  return getProvider().getAccount();
}
