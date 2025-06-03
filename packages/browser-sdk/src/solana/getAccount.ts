import { getAdapter } from "./getAdapter";

export function getAccount(): Promise<string | undefined> {
  return getAdapter().getAccount();
}
