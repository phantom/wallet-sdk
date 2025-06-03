import { getAdapter } from "./getAdapter";

export async function getAccount(): Promise<string | undefined> {
  const adapter = await getAdapter();
  return adapter.getAccount();
}
