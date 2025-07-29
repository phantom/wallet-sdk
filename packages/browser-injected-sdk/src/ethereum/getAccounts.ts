import { getProvider } from "./getProvider";

export async function getAccounts(): Promise<string[]> {
  const provider = await getProvider();

  if (!provider) {
    throw new Error("Provider not found.");
  }

  return provider.getAccounts();
}
