import { getProvider } from "./getProvider";

export async function getAccounts(): Promise<string[]> {
  const provider = await getProvider();

  return provider.getAccounts();
}
